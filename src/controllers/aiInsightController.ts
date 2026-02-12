import { Request, Response, NextFunction } from "express";
import AIInsight, { IAIInsight, InsightType } from "../models/AIInsight";
import { FilterQuery } from "mongoose";

export const createInsight = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const current_user_id = req.user?.userId;
    const user = req.user as any;

    if (!current_user_id) {
      res.status(401).json({
        success: false,
        message: "User not authenticated",
      });
      return;
    }

    const body = req.body;
    const insights = Array.isArray(body) ? body : [body];

    // Validate all insights
    for (const insight of insights) {
      const {
        insight_type,
        content,
        language_code,
        crop_name,
        region,
        confidence_score,
        validity_window_start,
        validity_window_end,
      } = insight;

      if (
        !insight_type ||
        !content ||
        !language_code ||
        !crop_name ||
        !region ||
        confidence_score === undefined ||
        !validity_window_start ||
        !validity_window_end
      ) {
        res.status(400).json({
          success: false,
          message:
            "All fields are required: insight_type, content, language_code, crop_name, region, confidence_score, validity_window_start, validity_window_end",
        });
        return;
      }

      const startDate = new Date(validity_window_start);
      const endDate = new Date(validity_window_end);

      if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
        res.status(400).json({
          success: false,
          message: `Invalid date format for insight "${insight_type}". Use YYYY-MM-DD or ISO format`,
        });
        return;
      }

      if (confidence_score < 0 || confidence_score > 1) {
        res.status(400).json({
          success: false,
          message: "Confidence score must be between 0 and 1",
        });
        return;
      }
    }

    // Create all insights
    const isAdmin = user?.role === "Admin";
    const createdInsights = await AIInsight.create(
      insights.map((insight) => ({
        user_id: isAdmin && insight.user_id ? insight.user_id : current_user_id,
        insight_type: insight.insight_type,
        content: insight.content,
        language_code: insight.language_code,
        crop_name: insight.crop_name,
        region: insight.region,
        confidence_score: insight.confidence_score,
        validity_window_start: new Date(insight.validity_window_start),
        validity_window_end: new Date(insight.validity_window_end),
      })),
    );

    res.status(201).json({
      success: true,
      data: Array.isArray(body) ? createdInsights : createdInsights[0],
      count: createdInsights.length,
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

    const insight = await AIInsight.findOne({ id });

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
