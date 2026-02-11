import { Request, Response, NextFunction } from "express";
import GovernmentScheme, {
  IGovernmentScheme,
} from "../models/GovernmentScheme";
import { FilterQuery } from "mongoose";
import { createAuditLog } from "../utils/auditLogger";
import { AuditAction } from "../models/AuditLog";

export const createScheme = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const body = req.body;

    // Handle batch creation (array) or single creation (object)
    const schemes = Array.isArray(body) ? body : [body];

    // Validation for each scheme
    for (const scheme of schemes) {
      const { name, description, state, crop, land_size_min, land_size_max, deadline } = scheme;

      if (
        !name ||
        !description ||
        !state ||
        !crop ||
        land_size_min === undefined ||
        land_size_max === undefined ||
        !deadline
      ) {
        res.status(400).json({
          success: false,
          message:
            "All fields are required for each scheme: name, description, state, crop, land_size_min, land_size_max, deadline",
        });
        return;
      }

      const deadlineDate = new Date(deadline);
      if (isNaN(deadlineDate.getTime())) {
        res.status(400).json({
          success: false,
          message: `Invalid deadline date format for scheme "${name}". Use YYYY-MM-DD or ISO format`,
        });
        return;
      }
    }

    // Create all schemes
    const createdSchemes = await GovernmentScheme.create(
      schemes.map((s) => ({
        name: s.name,
        description: s.description,
        state: s.state,
        crop: s.crop,
        land_size_min: s.land_size_min,
        land_size_max: s.land_size_max,
        deadline: new Date(s.deadline),
      }))
    );

    res.status(201).json({
      success: true,
      data: Array.isArray(body) ? createdSchemes : createdSchemes[0],
      count: createdSchemes.length,
    });
  } catch (error) {
    next(error);
  }
};

export const getSchemes = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { state, crop, active_only, page = "1", limit = "20" } = req.query;

    const filter: FilterQuery<IGovernmentScheme> = {};
    if (state) {
      filter.state = state as string;
    }
    if (crop) {
      filter.crop = crop as string;
    }
    if (active_only === "true") {
      filter.deadline = { $gte: new Date() };
    }

    const pageNum = Math.max(1, Number(page));
    const limitNum = Math.min(100, Math.max(1, Number(limit)));
    const skip = (pageNum - 1) * limitNum;

    const [schemes, total] = await Promise.all([
      GovernmentScheme.find(filter)
        .sort({ deadline: 1, created_at: -1 })
        .skip(skip)
        .limit(limitNum),
      GovernmentScheme.countDocuments(filter),
    ]);

    res.status(200).json({
      success: true,
      data: schemes,
      count: schemes.length,
      total,
      page: pageNum,
      totalPages: Math.ceil(total / limitNum),
    });
  } catch (error) {
    next(error);
  }
};

export const getSchemeById = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { id } = req.params;

    const scheme = await GovernmentScheme.findOne({ id });

    if (!scheme) {
      res.status(404).json({
        success: false,
        message: "Government scheme not found",
      });
      return;
    }

    res.status(200).json({
      success: true,
      data: scheme,
    });
  } catch (error) {
    next(error);
  }
};

export const searchSchemes = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { search, page = "1", limit = "20" } = req.query;

    const filter: FilterQuery<IGovernmentScheme> = {};
    if (search) {
      filter.$or = [
        { name: { $regex: search as string, $options: "i" } },
        { description: { $regex: search as string, $options: "i" } },
      ];
    }

    const pageNum = Math.max(1, Number(page));
    const limitNum = Math.min(100, Math.max(1, Number(limit)));
    const skip = (pageNum - 1) * limitNum;

    const [schemes, total] = await Promise.all([
      GovernmentScheme.find(filter)
        .sort({ created_at: -1 })
        .skip(skip)
        .limit(limitNum),
      GovernmentScheme.countDocuments(filter),
    ]);

    res.status(200).json({
      success: true,
      data: schemes,
      count: schemes.length,
      total,
      page: pageNum,
      totalPages: Math.ceil(total / limitNum),
    });
  } catch (error) {
    next(error);
  }
};

export const updateScheme = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { id } = req.params;
    const {
      name,
      description,
      state,
      crop,
      land_size_min,
      land_size_max,
      deadline,
    } = req.body;

    const scheme = await GovernmentScheme.findOne({ id });
    if (!scheme) {
      res.status(404).json({
        success: false,
        message: "Government scheme not found",
      });
      return;
    }

    const updateData: Partial<IGovernmentScheme> = {};
    if (name) updateData.name = name;
    if (description) updateData.description = description;
    if (state) updateData.state = state;
    if (crop) updateData.crop = crop;
    if (land_size_min !== undefined) updateData.land_size_min = land_size_min;
    if (land_size_max !== undefined) updateData.land_size_max = land_size_max;
    if (deadline) updateData.deadline = new Date(deadline);

    const updatedScheme = await GovernmentScheme.findOneAndUpdate(
      { id },
      updateData,
      { new: true, runValidators: true },
    );

    // Create audit log for scheme update
    const userId = req.user?.userId || "admin";
    await createAuditLog(
      userId,
      AuditAction.ADMIN_SCHEME_UPDATED,
      "GovernmentScheme",
      id,
    );

    res.status(200).json({
      success: true,
      data: updatedScheme,
    });
  } catch (error) {
    next(error);
  }
};

export const deleteScheme = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { id } = req.params;

    const scheme = await GovernmentScheme.findOne({ id });
    if (!scheme) {
      res.status(404).json({
        success: false,
        message: "Government scheme not found",
      });
      return;
    }

    await GovernmentScheme.findOneAndDelete({ id });

    res.status(200).json({
      success: true,
      message: "Government scheme deleted successfully",
    });
  } catch (error) {
    next(error);
  }
};
