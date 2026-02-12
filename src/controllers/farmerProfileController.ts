import { Request, Response, NextFunction } from "express";
import FarmerProfile, { IFarmerProfile } from "../models/FarmerProfile";
import { FilterQuery } from "mongoose";

export const getAllFarmerProfiles = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const {
      page = 1,
      limit = 10,
      user_id,
      min_land_size,
      max_land_size,
      manual_location_correction,
      sort_by = "created_at",
      sort_order = "desc",
    } = req.query;

    const filter: FilterQuery<IFarmerProfile> = {};
    if (user_id) filter.user_id = user_id as string;
    if (min_land_size || max_land_size) {
      filter.land_size = {};
      if (min_land_size) filter.land_size.$gte = Number(min_land_size);
      if (max_land_size) filter.land_size.$lte = Number(max_land_size);
    }
    if (manual_location_correction !== undefined) {
      filter.manual_location_correction = manual_location_correction === "true";
    }

    const pageNum = Math.max(1, Number(page));
    const limitNum = Math.min(100, Math.max(1, Number(limit)));
    const skip = (pageNum - 1) * limitNum;

    const sortObj: Record<string, 1 | -1> = {};
    sortObj[sort_by as string] = sort_order === "asc" ? 1 : -1;

    const [farmerProfiles, total] = await Promise.all([
      FarmerProfile.find(filter).sort(sortObj).skip(skip).limit(limitNum),
      FarmerProfile.countDocuments(filter),
    ]);

    res.status(200).json({
      success: true,
      count: farmerProfiles.length,
      total,
      page: pageNum,
      totalPages: Math.ceil(total / limitNum),
      data: farmerProfiles,
    });
  } catch (error) {
    next(error);
  }
};

export const getFarmerProfileById = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const farmerProfile = await FarmerProfile.findOne({
      id: req.params.id,
    });

    if (!farmerProfile) {
      res.status(404).json({
        success: false,
        message: "Farmer profile not found",
      });
      return;
    }

    res.status(200).json({
      success: true,
      data: farmerProfile,
    });
  } catch (error) {
    next(error);
  }
};

export const getFarmerProfileByUserId = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const farmerProfile = await FarmerProfile.findOne({
      user_id: req.params.userId,
    });

    if (!farmerProfile) {
      res.status(404).json({
        success: false,
        message: "Farmer profile not found for this user",
      });
      return;
    }

    res.status(200).json({
      success: true,
      data: farmerProfile,
    });
  } catch (error) {
    next(error);
  }
};

export const createFarmerProfile = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const {
      user_id,
      land_size,
      location_latitude,
      location_longitude,
      manual_location_correction,
    } = req.body;

    const existingProfile = await FarmerProfile.findOne({ user_id });
    if (existingProfile) {
      res.status(400).json({
        success: false,
        message: "Farmer profile already exists for this user",
      });
      return;
    }

    const farmerProfile = await FarmerProfile.create({
      user_id,
      land_size,
      location_latitude,
      location_longitude,
      manual_location_correction,
    });

    res.status(201).json({
      success: true,
      data: farmerProfile,
    });
  } catch (error) {
    next(error);
  }
};

export const updateFarmerProfile = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const {
      land_size,
      location_latitude,
      location_longitude,
      manual_location_correction,
    } = req.body;

    const updateData: Partial<IFarmerProfile> = {};
    if (land_size !== undefined) updateData.land_size = land_size;
    if (location_latitude !== undefined)
      updateData.location_latitude = location_latitude;
    if (location_longitude !== undefined)
      updateData.location_longitude = location_longitude;
    if (manual_location_correction !== undefined)
      updateData.manual_location_correction = manual_location_correction;

    const farmerProfile = await FarmerProfile.findOneAndUpdate(
      { id: req.params.id },
      updateData,
      { new: true, runValidators: true },
    );

    if (!farmerProfile) {
      res.status(404).json({
        success: false,
        message: "Farmer profile not found",
      });
      return;
    }

    res.status(200).json({
      success: true,
      data: farmerProfile,
    });
  } catch (error) {
    next(error);
  }
};

export const deleteFarmerProfile = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const farmerProfile = await FarmerProfile.findOneAndDelete({
      id: req.params.id,
    });

    if (!farmerProfile) {
      res.status(404).json({
        success: false,
        message: "Farmer profile not found",
      });
      return;
    }

    res.status(200).json({
      success: true,
      message: "Farmer profile deleted successfully",
    });
  } catch (error) {
    next(error);
  }
};
