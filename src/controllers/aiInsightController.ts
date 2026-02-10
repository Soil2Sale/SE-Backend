import { Request, Response, NextFunction } from "express";
import AIInsight, { IAIInsight, InsightType } from "../models/AIInsight";
import { FilterQuery } from "mongoose";

export const createInsight = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const {
      insight_type,
      content,
      language_code,
      crop_name,
      region,
      confidence_score,
      validity_window_start,
      validity_window_end,
    } = req.body;
    const user_id = req.user?.userId;

    if (!user_id) {
      res.status(401).json({
        success: false,
        message: "User not authenticated",
      });
      return;
    }

    const insight = await AIInsight.create({
      user_id,
      insight_type,
      content,
      language_code,
      crop_name,
      region,
      confidence_score,
      validity_window_start: new Date(validity_window_start),
      validity_window_end: new Date(validity_window_end),
    });

    res.status(201).json({
      success: true,
      data: insight,
    });
  } catch (error) {
    next(error);
  }
};

export const getInsightsByUser = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const user_id = req.user?.userId;
    const { insight_type, crop_name, page = "1", limit = "20" } = req.query;

    if (!user_id) {
      res.status(401).json({
        success: false,
        message: "User not authenticated",
      });
      return;
    }

    const filter: FilterQuery<IAIInsight> = {
      user_id,
      validity_window_end: { $gte: new Date() },
    };
    if (insight_type) {
      filter.insight_type = insight_type as InsightType;
    }
    if (crop_name) {
      filter.crop_name = crop_name as string;
    }

    const pageNum = Math.max(1, Number(page));
    const limitNum = Math.min(100, Math.max(1, Number(limit)));
    const skip = (pageNum - 1) * limitNum;

    const [insights, total] = await Promise.all([
      AIInsight.find(filter)
        .sort({ created_at: -1 })
        .skip(skip)
        .limit(limitNum),
      AIInsight.countDocuments(filter),
    ]);

    res.status(200).json({
      success: true,
      data: insights,
      count: insights.length,
      total,
      page: pageNum,
      totalPages: Math.ceil(total / limitNum),
    });
  } catch (error) {
    next(error);
  }
};

export const getInsightById = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { id } = req.params;

    const insight = await AIInsight.findOne({ id }).populate(
      "user_id",
      "name email",
    );

    if (!insight) {
      res.status(404).json({
        success: false,
        message: "AI insight not found",
      });
      return;
    }

    res.status(200).json({
      success: true,
      data: insight,
    });
  } catch (error) {
    next(error);
  }
};

export const getInsightsByCategory = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { category } = req.params;
    const { crop_name, region, page = "1", limit = "20" } = req.query;

    const filter: FilterQuery<IAIInsight> = {
      insight_type: category as InsightType,
      validity_window_end: { $gte: new Date() },
    };
    if (crop_name) {
      filter.crop_name = crop_name as string;
    }
    if (region) {
      filter.region = region as string;
    }

    const pageNum = Math.max(1, Number(page));
    const limitNum = Math.min(100, Math.max(1, Number(limit)));
    const skip = (pageNum - 1) * limitNum;

    const [insights, total] = await Promise.all([
      AIInsight.find(filter)
        .sort({ confidence_score: -1, created_at: -1 })
        .skip(skip)
        .limit(limitNum),
      AIInsight.countDocuments(filter),
    ]);

    res.status(200).json({
      success: true,
      data: insights,
      count: insights.length,
      total,
      page: pageNum,
      totalPages: Math.ceil(total / limitNum),
    });
  } catch (error) {
    next(error);
  }
};

export const deleteInsight = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { id } = req.params;

    const insight = await AIInsight.findOne({ id });
    if (!insight) {
      res.status(404).json({
        success: false,
        message: "AI insight not found",
      });
      return;
    }

    await AIInsight.findOneAndDelete({ id });

    res.status(200).json({
      success: true,
      message: "AI insight deleted successfully",
    });
  } catch (error) {
    next(error);
  }
};
