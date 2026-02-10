import { Request, Response, NextFunction } from "express";
import YieldHistory, { IYieldHistory } from "../models/YieldHistory";
import FarmerCrop from "../models/FarmerCrop";
import { FilterQuery } from "mongoose";

export const createYieldRecord = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { farmer_crop_id, year, yield_quantity, consent_sharing } = req.body;
    const user_id = req.user?.userId;

    if (!user_id) {
      res.status(401).json({
        success: false,
        message: "User not authenticated",
      });
      return;
    }

    const farmerCrop = await FarmerCrop.findOne({ id: farmer_crop_id });
    if (!farmerCrop) {
      res.status(404).json({
        success: false,
        message: "Farmer crop not found",
      });
      return;
    }

    if (farmerCrop.farmer_user_id !== user_id) {
      res.status(403).json({
        success: false,
        message: "You are not authorized to add yield for this crop",
      });
      return;
    }

    const yieldRecord = await YieldHistory.create({
      farmer_crop_id,
      farmer_user_id: user_id,
      year,
      yield_quantity,
      consent_sharing: consent_sharing || false,
    });

    res.status(201).json({
      success: true,
      data: yieldRecord,
    });
  } catch (error) {
    next(error);
  }
};

export const getYieldsByFarmer = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const user_id = req.user?.userId;
    const { year, page = "1", limit = "20" } = req.query;

    if (!user_id) {
      res.status(401).json({
        success: false,
        message: "User not authenticated",
      });
      return;
    }

    const filter: FilterQuery<IYieldHistory> = {
      farmer_user_id: user_id,
    };
    if (year) {
      filter.year = Number(year);
    }

    const pageNum = Math.max(1, Number(page));
    const limitNum = Math.min(100, Math.max(1, Number(limit)));
    const skip = (pageNum - 1) * limitNum;

    const [yields, total] = await Promise.all([
      YieldHistory.find(filter)
        .populate("farmer_crop_id", "crop_name land_area_acres")
        .sort({ year: -1 })
        .skip(skip)
        .limit(limitNum),
      YieldHistory.countDocuments(filter),
    ]);

    res.status(200).json({
      success: true,
      data: yields,
      count: yields.length,
      total,
      page: pageNum,
      totalPages: Math.ceil(total / limitNum),
    });
  } catch (error) {
    next(error);
  }
};

export const getYieldsByCrop = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { cropId } = req.params;

    const yields = await YieldHistory.find({ farmer_crop_id: cropId })
      .populate("farmer_crop_id", "crop_name land_area_acres")
      .sort({ year: -1 });

    res.status(200).json({
      success: true,
      data: yields,
      count: yields.length,
    });
  } catch (error) {
    next(error);
  }
};

export const getYieldById = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { id } = req.params;

    const yieldRecord = await YieldHistory.findOne({ id }).populate(
      "farmer_crop_id",
      "crop_name land_area_acres farmer_user_id",
    );

    if (!yieldRecord) {
      res.status(404).json({
        success: false,
        message: "Yield record not found",
      });
      return;
    }

    res.status(200).json({
      success: true,
      data: yieldRecord,
    });
  } catch (error) {
    next(error);
  }
};

export const updateYieldRecord = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { id } = req.params;
    const { year, yield_quantity, consent_sharing } = req.body;
    const user_id = req.user?.userId;

    if (!user_id) {
      res.status(401).json({
        success: false,
        message: "User not authenticated",
      });
      return;
    }

    const yieldRecord = await YieldHistory.findOne({ id }).populate(
      "farmer_crop_id",
    );
    if (!yieldRecord) {
      res.status(404).json({
        success: false,
        message: "Yield record not found",
      });
      return;
    }

    const farmerCrop =
      yieldRecord.farmer_crop_id as typeof FarmerCrop.prototype;
    if (farmerCrop.farmer_user_id !== user_id) {
      res.status(403).json({
        success: false,
        message: "You are not authorized to update this yield record",
      });
      return;
    }

    const updateData: Partial<IYieldHistory> = {};
    if (year !== undefined) updateData.year = year;
    if (yield_quantity !== undefined)
      updateData.yield_quantity = yield_quantity;
    if (consent_sharing !== undefined)
      updateData.consent_sharing = consent_sharing;

    const updatedYield = await YieldHistory.findOneAndUpdate(
      { id },
      updateData,
      {
        new: true,
        runValidators: true,
      },
    );

    res.status(200).json({
      success: true,
      data: updatedYield,
    });
  } catch (error) {
    next(error);
  }
};

export const deleteYieldRecord = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { id } = req.params;
    const user_id = req.user?.userId;

    if (!user_id) {
      res.status(401).json({
        success: false,
        message: "User not authenticated",
      });
      return;
    }

    const yieldRecord = await YieldHistory.findOne({ id }).populate(
      "farmer_crop_id",
    );
    if (!yieldRecord) {
      res.status(404).json({
        success: false,
        message: "Yield record not found",
      });
      return;
    }

    const farmerCrop =
      yieldRecord.farmer_crop_id as typeof FarmerCrop.prototype;
    if (farmerCrop.farmer_user_id !== user_id) {
      res.status(403).json({
        success: false,
        message: "You are not authorized to delete this yield record",
      });
      return;
    }

    await YieldHistory.findOneAndDelete({ id });

    res.status(200).json({
      success: true,
      message: "Yield record deleted successfully",
    });
  } catch (error) {
    next(error);
  }
};

export const getYieldAnalytics = async (
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

    const analytics = await YieldHistory.aggregate([
      { $match: { farmer_user_id: user_id } },
      {
        $group: {
          _id: "$farmer_crop_id",
          avgYield: { $avg: "$yield_quantity" },
          maxYield: { $max: "$yield_quantity" },
          minYield: { $min: "$yield_quantity" },
          totalRecords: { $sum: 1 },
        },
      },
      {
        $lookup: {
          from: "farmercrops",
          localField: "_id",
          foreignField: "id",
          as: "cropInfo",
        },
      },
      { $unwind: "$cropInfo" },
      {
        $project: {
          farmer_crop_id: "$_id",
          crop_name: "$cropInfo.crop_name",
          avgYield: 1,
          maxYield: 1,
          minYield: 1,
          totalRecords: 1,
          _id: 0,
        },
      },
    ]);

    res.status(200).json({
      success: true,
      data: analytics,
      count: analytics.length,
    });
  } catch (error) {
    next(error);
  }
};
