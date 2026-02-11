import { Request, Response, NextFunction } from "express";
import LogisticsProviderProfile, {
  ILogisticsProviderProfile,
} from "../models/LogisticsProviderProfile";
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
        .populate("user_id", "name email phone_number")
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

    const profile = await LogisticsProviderProfile.findOne({ id }).populate(
      "user_id",
      "name email phone_number",
    );

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
    }).populate("user_id", "name email phone_number");

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
