import { Request, Response, NextFunction } from "express";
import FarmerCrop, { IFarmerCrop } from "../models/FarmerCrop";
import FarmerProfile from "../models/FarmerProfile";
import { FilterQuery } from "mongoose";

export const getAllFarmerCrops = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const {
      page = 1,
      limit = 10,
      farmer_profile_id,
      crop_name,
      seasonality,
      search,
      sort_by = "created_at",
      sort_order = "desc",
    } = req.query;

    const filter: FilterQuery<IFarmerCrop> = {};
    if (farmer_profile_id)
      filter.farmer_profile_id = farmer_profile_id as string;
    if (crop_name)
      filter.crop_name = { $regex: crop_name as string, $options: "i" };
    if (seasonality)
      filter.seasonality = { $regex: seasonality as string, $options: "i" };
    if (search) {
      filter.$or = [
        { crop_name: { $regex: search as string, $options: "i" } },
        { seasonality: { $regex: search as string, $options: "i" } },
      ];
    }

    const pageNum = Math.max(1, Number(page));
    const limitNum = Math.min(100, Math.max(1, Number(limit)));
    const skip = (pageNum - 1) * limitNum;

    const sortObj: Record<string, 1 | -1> = {};
    sortObj[sort_by as string] = sort_order === "asc" ? 1 : -1;

    const [farmerCrops, total] = await Promise.all([
      FarmerCrop.find(filter)
        .populate("farmer_profile_id")
        .sort(sortObj)
        .skip(skip)
        .limit(limitNum),
      FarmerCrop.countDocuments(filter),
    ]);

    res.status(200).json({
      success: true,
      count: farmerCrops.length,
      total,
      page: pageNum,
      totalPages: Math.ceil(total / limitNum),
      data: farmerCrops,
    });
  } catch (error) {
    next(error);
  }
};

export const getFarmerCropById = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const farmerCrop = await FarmerCrop.findOne({ id: req.params.id }).populate(
      "farmer_profile_id",
    );

    if (!farmerCrop) {
      res.status(404).json({
        success: false,
        message: "Farmer crop not found",
      });
      return;
    }

    res.status(200).json({
      success: true,
      data: farmerCrop,
    });
  } catch (error) {
    next(error);
  }
};

export const getFarmerCropsByFarmerId = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const farmerCrops = await FarmerCrop.find({
      farmer_profile_id: req.params.farmerId,
    }).populate("farmer_profile_id");

    res.status(200).json({
      success: true,
      count: farmerCrops.length,
      data: farmerCrops,
    });
  } catch (error) {
    next(error);
  }
};

export const getFarmerCropsByCropName = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const farmerCrops = await FarmerCrop.find({
      crop_name: req.params.cropName,
    }).populate("farmer_profile_id");

    res.status(200).json({
      success: true,
      count: farmerCrops.length,
      data: farmerCrops,
    });
  } catch (error) {
    next(error);
  }
};

export const createFarmerCrop = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { farmer_profile_id, crop_name, seasonality } = req.body;

    const profile = await FarmerProfile.findOne({ id: farmer_profile_id });
    if (!profile) {
      res.status(404).json({
        success: false,
        message: "Farmer profile not found",
      });
      return;
    }

    const farmerCrop = await FarmerCrop.create({
      farmer_profile_id,
      farmer_user_id: profile.user_id,
      crop_name,
      seasonality,
    });

    res.status(201).json({
      success: true,
      data: farmerCrop,
    });
  } catch (error) {
    next(error);
  }
};

export const updateFarmerCrop = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { crop_name, seasonality } = req.body;

    const updateData: Partial<IFarmerCrop> = {};
    if (crop_name) updateData.crop_name = crop_name;
    if (seasonality) updateData.seasonality = seasonality;

    const farmerCrop = await FarmerCrop.findOneAndUpdate(
      { id: req.params.id },
      updateData,
      { new: true, runValidators: true },
    );

    if (!farmerCrop) {
      res.status(404).json({
        success: false,
        message: "Farmer crop not found",
      });
      return;
    }

    res.status(200).json({
      success: true,
      data: farmerCrop,
    });
  } catch (error) {
    next(error);
  }
};

export const deleteFarmerCrop = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const farmerCrop = await FarmerCrop.findOneAndDelete({ id: req.params.id });

    if (!farmerCrop) {
      res.status(404).json({
        success: false,
        message: "Farmer crop not found",
      });
      return;
    }

    res.status(200).json({
      success: true,
      message: "Farmer crop deleted successfully",
    });
  } catch (error) {
    next(error);
  }
};
