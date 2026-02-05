import { Request, Response, NextFunction } from "express";
import CropListing, {
  CropListingStatus,
  QualityGrade,
  ICropListing,
} from "../models/CropListing";
import { FilterQuery } from "mongoose";

export const getAllCropListings = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const {
      page = 1,
      limit = 10,
      status,
      crop_name,
      quality_grade,
      farmer_profile_id,
      min_quantity,
      max_quantity,
      min_price,
      max_price,
      search,
      sort_by = "created_at",
      sort_order = "desc",
    } = req.query;

    const filter: FilterQuery<ICropListing> = {};
    if (status) filter.status = status as CropListingStatus;
    if (crop_name)
      filter.crop_name = { $regex: crop_name as string, $options: "i" };
    if (quality_grade) filter.quality_grade = quality_grade as QualityGrade;
    if (farmer_profile_id)
      filter.farmer_profile_id = farmer_profile_id as string;

    if (min_quantity || max_quantity) {
      filter.quantity = {};
      if (min_quantity) filter.quantity.$gte = Number(min_quantity);
      if (max_quantity) filter.quantity.$lte = Number(max_quantity);
    }

    if (min_price || max_price) {
      filter.expected_price = {};
      if (min_price) filter.expected_price.$gte = Number(min_price);
      if (max_price) filter.expected_price.$lte = Number(max_price);
    }

    if (search) {
      filter.crop_name = { $regex: search as string, $options: "i" };
    }

    const pageNum = Math.max(1, Number(page));
    const limitNum = Math.min(100, Math.max(1, Number(limit)));
    const skip = (pageNum - 1) * limitNum;

    const sortObj: Record<string, 1 | -1> = {};
    sortObj[sort_by as string] = sort_order === "asc" ? 1 : -1;

    const [cropListings, total] = await Promise.all([
      CropListing.find(filter)
        .populate("farmer_profile_id")
        .sort(sortObj)
        .skip(skip)
        .limit(limitNum),
      CropListing.countDocuments(filter),
    ]);

    res.status(200).json({
      success: true,
      count: cropListings.length,
      total,
      page: pageNum,
      totalPages: Math.ceil(total / limitNum),
      data: cropListings,
    });
  } catch (error) {
    next(error);
  }
};

export const getCropListingById = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const cropListing = await CropListing.findOne({
      id: req.params.id,
    }).populate("farmer_profile_id");

    if (!cropListing) {
      res.status(404).json({
        success: false,
        message: "Crop listing not found",
      });
      return;
    }

    res.status(200).json({
      success: true,
      data: cropListing,
    });
  } catch (error) {
    next(error);
  }
};

export const getCropListingsByFarmerId = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const cropListings = await CropListing.find({
      farmer_profile_id: req.params.farmerId,
    })
      .populate("farmer_profile_id")
      .sort({ created_at: -1 });

    res.status(200).json({
      success: true,
      count: cropListings.length,
      data: cropListings,
    });
  } catch (error) {
    next(error);
  }
};

export const getActiveCropListings = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const cropListings = await CropListing.find({
      status: CropListingStatus.ACTIVE,
    })
      .populate("farmer_profile_id")
      .sort({ created_at: -1 });

    res.status(200).json({
      success: true,
      count: cropListings.length,
      data: cropListings,
    });
  } catch (error) {
    next(error);
  }
};

export const createCropListing = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const {
      farmer_profile_id,
      crop_name,
      quality_grade,
      quantity,
      expected_price,
      status,
    } = req.body;

    const cropListing = await CropListing.create({
      farmer_profile_id,
      crop_name,
      quality_grade,
      quantity,
      expected_price,
      status: status || CropListingStatus.DRAFT,
    });

    res.status(201).json({
      success: true,
      data: cropListing,
    });
  } catch (error) {
    next(error);
  }
};

export const updateCropListing = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { crop_name, quality_grade, quantity, expected_price, status } =
      req.body;

    const updateData: Partial<ICropListing> = {};
    if (crop_name) updateData.crop_name = crop_name;
    if (quality_grade) updateData.quality_grade = quality_grade;
    if (quantity !== undefined) updateData.quantity = quantity;
    if (expected_price !== undefined)
      updateData.expected_price = expected_price;
    if (status) updateData.status = status;

    const cropListing = await CropListing.findOneAndUpdate(
      { id: req.params.id },
      updateData,
      { new: true, runValidators: true },
    );

    if (!cropListing) {
      res.status(404).json({
        success: false,
        message: "Crop listing not found",
      });
      return;
    }

    res.status(200).json({
      success: true,
      data: cropListing,
    });
  } catch (error) {
    next(error);
  }
};

export const updateCropListingStatus = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { status } = req.body;

    if (!status || !Object.values(CropListingStatus).includes(status)) {
      res.status(400).json({
        success: false,
        message: "Invalid status value",
      });
      return;
    }

    const cropListing = await CropListing.findOneAndUpdate(
      { id: req.params.id },
      { status },
      { new: true, runValidators: true },
    );

    if (!cropListing) {
      res.status(404).json({
        success: false,
        message: "Crop listing not found",
      });
      return;
    }

    res.status(200).json({
      success: true,
      data: cropListing,
    });
  } catch (error) {
    next(error);
  }
};

export const deleteCropListing = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const cropListing = await CropListing.findOneAndDelete({
      id: req.params.id,
    });

    if (!cropListing) {
      res.status(404).json({
        success: false,
        message: "Crop listing not found",
      });
      return;
    }

    res.status(200).json({
      success: true,
      message: "Crop listing deleted successfully",
    });
  } catch (error) {
    next(error);
  }
};
