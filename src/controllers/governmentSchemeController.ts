import { Request, Response, NextFunction } from "express";
import GovernmentScheme, {
  IGovernmentScheme,
} from "../models/GovernmentScheme";
import { FilterQuery } from "mongoose";

export const createScheme = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const {
      name,
      description,
      state,
      crop,
      land_size_min,
      land_size_max,
      deadline,
    } = req.body;

    const scheme = await GovernmentScheme.create({
      name,
      description,
      state,
      crop,
      land_size_min,
      land_size_max,
      deadline: new Date(deadline),
    });

    res.status(201).json({
      success: true,
      data: scheme,
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
