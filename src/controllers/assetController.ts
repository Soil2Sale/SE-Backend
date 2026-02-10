import { Request, Response, NextFunction } from "express";
import Asset, { IAsset } from "../models/Asset";
import { FilterQuery } from "mongoose";

export const createAsset = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { asset_type, file_url, description } = req.body;
    const user_id = req.user?.userId;

    if (!user_id) {
      res.status(401).json({
        success: false,
        message: "User not authenticated",
      });
      return;
    }

    const asset = await Asset.create({
      user_id,
      asset_type,
      file_url,
      description,
    });

    res.status(201).json({
      success: true,
      data: asset,
    });
  } catch (error) {
    next(error);
  }
};

export const getAssetsByUser = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const user_id = req.user?.userId;
    const { asset_type, page = "1", limit = "20" } = req.query;

    if (!user_id) {
      res.status(401).json({
        success: false,
        message: "User not authenticated",
      });
      return;
    }

    const filter: FilterQuery<IAsset> = { user_id };
    if (asset_type) {
      filter.asset_type = asset_type as string;
    }

    const pageNum = Math.max(1, Number(page));
    const limitNum = Math.min(100, Math.max(1, Number(limit)));
    const skip = (pageNum - 1) * limitNum;

    const [assets, total] = await Promise.all([
      Asset.find(filter).sort({ created_at: -1 }).skip(skip).limit(limitNum),
      Asset.countDocuments(filter),
    ]);

    res.status(200).json({
      success: true,
      data: assets,
      count: assets.length,
      total,
      page: pageNum,
      totalPages: Math.ceil(total / limitNum),
    });
  } catch (error) {
    next(error);
  }
};

export const getAssetById = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { id } = req.params;

    const asset = await Asset.findOne({ id }).populate("user_id", "name email");

    if (!asset) {
      res.status(404).json({
        success: false,
        message: "Asset not found",
      });
      return;
    }

    res.status(200).json({
      success: true,
      data: asset,
    });
  } catch (error) {
    next(error);
  }
};

export const updateAsset = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { id } = req.params;
    const { asset_type, file_url, description } = req.body;
    const user_id = req.user?.userId;

    if (!user_id) {
      res.status(401).json({
        success: false,
        message: "User not authenticated",
      });
      return;
    }

    const asset = await Asset.findOne({ id });
    if (!asset) {
      res.status(404).json({
        success: false,
        message: "Asset not found",
      });
      return;
    }

    if (asset.user_id !== user_id) {
      res.status(403).json({
        success: false,
        message: "You are not authorized to update this asset",
      });
      return;
    }

    const updateData: Partial<IAsset> = {};
    if (asset_type) updateData.asset_type = asset_type;
    if (file_url) updateData.file_url = file_url;
    if (description !== undefined) updateData.description = description;

    const updatedAsset = await Asset.findOneAndUpdate({ id }, updateData, {
      new: true,
      runValidators: true,
    });

    res.status(200).json({
      success: true,
      data: updatedAsset,
    });
  } catch (error) {
    next(error);
  }
};

export const deleteAsset = async (
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

    const asset = await Asset.findOne({ id });
    if (!asset) {
      res.status(404).json({
        success: false,
        message: "Asset not found",
      });
      return;
    }

    if (asset.user_id !== user_id) {
      res.status(403).json({
        success: false,
        message: "You are not authorized to delete this asset",
      });
      return;
    }

    await Asset.findOneAndDelete({ id });

    res.status(200).json({
      success: true,
      message: "Asset deleted successfully",
    });
  } catch (error) {
    next(error);
  }
};
