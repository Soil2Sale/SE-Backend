import { Request, Response, NextFunction } from "express";
import LogisticsProviderProfile, {
  ILogisticsProviderProfile,
} from "../models/LogisticsProviderProfile";
import Vehicle from "../models/Vehicle";
import { FilterQuery } from "mongoose";

export const createLogisticsProfile = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { company_name } = req.body;
    const user_id = req.user?.userId;

    if (!user_id) {
      res.status(401).json({
        success: false,
        message: "User not authenticated",
      });
      return;
    }

    if (!company_name || company_name.trim() === "") {
      res.status(400).json({
        success: false,
        message: "Company name is required",
      });
      return;
    }

    const existingProfile = await LogisticsProviderProfile.findOne({ user_id });
    if (existingProfile) {
      res.status(400).json({
        success: false,
        message: "Logistics provider profile already exists for this user",
      });
      return;
    }

    const profile = await LogisticsProviderProfile.create({
      user_id, // This will be stored as the authenticated user's ID
      company_name,
      verified: false,
    });

    res.status(201).json({
      success: true,
      data: profile,
    });
  } catch (error) {
    next(error);
  }
};

export const getLogisticsProfiles = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { verified, page = "1", limit = "20" } = req.query;

    const filter: FilterQuery<ILogisticsProviderProfile> = {};
    if (verified !== undefined) {
      filter.verified = verified === "true";
    }

    const pageNum = Math.max(1, Number(page));
    const limitNum = Math.min(100, Math.max(1, Number(limit)));
    const skip = (pageNum - 1) * limitNum;

    const [profiles, total] = await Promise.all([
      LogisticsProviderProfile.find(filter)
        .populate({
          path: "user_id",
          foreignField: "id",
          select: "name email phone_number",
        })
        .sort({ created_at: -1 })
        .skip(skip)
        .limit(limitNum),
      LogisticsProviderProfile.countDocuments(filter),
    ]);

    res.status(200).json({
      success: true,
      data: profiles,
      count: profiles.length,
      total,
      page: pageNum,
      totalPages: Math.ceil(total / limitNum),
    });
  } catch (error) {
    next(error);
  }
};

export const getLogisticsProfileById = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { id } = req.params;

    const profile = await LogisticsProviderProfile.findOne({ id }).populate({
      path: "user_id",
      foreignField: "id",
      select: "name email phone_number",
    });

    if (!profile) {
      res.status(404).json({
        success: false,
        message: "Logistics provider profile not found",
      });
      return;
    }

    res.status(200).json({
      success: true,
      data: profile,
    });
  } catch (error) {
    next(error);
  }
};

export const getLogisticsProfileByUser = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const user_id = req.user?.userId;

    if (!user_id) {
      res.status(401).json({
        success: false,
        message: "User not authenticated",
      });
      return;
    }

    const profile = await LogisticsProviderProfile.findOne({
      user_id,
    }).populate({
      path: "user_id",
      foreignField: "id",
      select: "name email phone_number",
    });

    if (!profile) {
      res.status(404).json({
        success: false,
        message: "Logistics provider profile not found",
      });
      return;
    }

    res.status(200).json({
      success: true,
      data: profile,
    });
  } catch (error) {
    next(error);
  }
};

export const updateLogisticsProfile = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { id } = req.params;
    const { company_name } = req.body;
    const user_id = req.user?.userId;

    if (!user_id) {
      res.status(401).json({
        success: false,
        message: "User not authenticated",
      });
      return;
    }

    const profile = await LogisticsProviderProfile.findOne({ id });
    if (!profile) {
      res.status(404).json({
        success: false,
        message: "Logistics provider profile not found",
      });
      return;
    }

    if (profile.user_id !== user_id) {
      res.status(403).json({
        success: false,
        message: "You are not authorized to update this profile",
      });
      return;
    }

    const updateData: Partial<ILogisticsProviderProfile> = {};
    if (company_name) updateData.company_name = company_name;

    const updatedProfile = await LogisticsProviderProfile.findOneAndUpdate(
      { id },
      updateData,
      { new: true, runValidators: true },
    );

    res.status(200).json({
      success: true,
      data: updatedProfile,
    });
  } catch (error) {
    next(error);
  }
};

export const verifyLogisticsProvider = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { id } = req.params;
    const user = req.user as any;

    // Admin authorization check
    if (user?.role !== "Admin") {
      res.status(403).json({
        success: false,
        message: "Only admins can verify logistics providers",
      });
      return;
    }

    const profile = await LogisticsProviderProfile.findOne({ id });
    if (!profile) {
      res.status(404).json({
        success: false,
        message: "Logistics provider profile not found",
      });
      return;
    }

    profile.verified = true;
    await profile.save();

    res.status(200).json({
      success: true,
      data: profile,
    });
  } catch (error) {
    next(error);
  }
};

export const createLogisticsProviderByAdmin = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { company_name, user_id } = req.body;
    const admin = req.user as any;

    // Admin authorization check
    if (admin?.role !== "Admin") {
      res.status(403).json({
        success: false,
        message: "Only admins can create logistics provider profiles",
      });
      return;
    }

    if (!company_name || company_name.trim() === "") {
      res.status(400).json({
        success: false,
        message: "Company name is required",
      });
      return;
    }

    if (!user_id || user_id.trim() === "") {
      res.status(400).json({
        success: false,
        message: "User ID is required",
      });
      return;
    }

    const existingProfile = await LogisticsProviderProfile.findOne({ user_id });
    if (existingProfile) {
      res.status(400).json({
        success: false,
        message: "Logistics provider profile already exists for this user",
      });
      return;
    }

    const profile = await LogisticsProviderProfile.create({
      user_id, // Link to the specified user ID
      company_name,
      verified: true, // Auto-verify when created by admin
    });

    res.status(201).json({
      success: true,
      data: profile,
    });
  } catch (error) {
    next(error);
  }
};

// GET /logistics-providers/available — Providers with ≥1 available vehicle
export const getAvailableLogisticsProviders = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { page = "1", limit = "20" } = req.query;

    const availableProfileIds = await Vehicle.distinct(
      "logistics_provider_profile_id",
      { available: true },
    );

    if (availableProfileIds.length === 0) {
      res.status(200).json({
        success: true,
        data: [],
        count: 0,
        total: 0,
        page: 1,
        totalPages: 0,
      });
      return;
    }

    const pageNum = Math.max(1, Number(page));
    const limitNum = Math.min(100, Math.max(1, Number(limit)));
    const skip = (pageNum - 1) * limitNum;

    const filter: FilterQuery<ILogisticsProviderProfile> = {
      id: { $in: availableProfileIds },
    };

    const [profiles, total] = await Promise.all([
      LogisticsProviderProfile.find(filter)
        .populate({
          path: "user_id",
          foreignField: "id",
          select: "name email phone_number",
        })
        .sort({ created_at: -1 })
        .skip(skip)
        .limit(limitNum),
      LogisticsProviderProfile.countDocuments(filter),
    ]);

    // Attach available vehicles to each profile
    const profileIds = profiles.map((p) => p.id);
    const vehicles = await Vehicle.find(
      { logistics_provider_profile_id: { $in: profileIds }, available: true },
      {
        id: 1,
        vehicle_type: 1,
        capacity: 1,
        available: 1,
        logistics_provider_profile_id: 1,
        _id: 0,
      },
    );

    const vehiclesByProfile = vehicles.reduce<Record<string, typeof vehicles>>(
      (acc, v) => {
        const pid = v.logistics_provider_profile_id;
        if (!acc[pid]) acc[pid] = [];
        acc[pid].push(v);
        return acc;
      },
      {},
    );

    const data = profiles.map((p) => ({
      ...p.toObject(),
      vehicles: vehiclesByProfile[p.id] ?? [],
    }));

    res.status(200).json({
      success: true,
      data,
      count: data.length,
      total,
      page: pageNum,
      totalPages: Math.ceil(total / limitNum),
    });
  } catch (error) {
    next(error);
  }
};
