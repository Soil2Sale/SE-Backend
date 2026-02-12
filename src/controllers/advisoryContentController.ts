import { Request, Response, NextFunction } from "express";
import AdvisoryContent, { IAdvisoryContent } from "../models/AdvisoryContent";
import { FilterQuery } from "mongoose";
import { createAuditLog } from "../utils/auditLogger";
import { AuditAction } from "../models/AuditLog";

export const createAdvisory = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { title, content, source, language_code } = req.body;

    const advisory = await AdvisoryContent.create({
      title,
      content,
      source,
      language_code,
    });

    res.status(201).json({
      success: true,
      data: advisory,
    });
  } catch (error) {
    next(error);
  }
};

export const getAdvisories = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { language_code, search, page = "1", limit = "20" } = req.query;

    const filter: FilterQuery<IAdvisoryContent> = {};
    if (language_code) {
      filter.language_code = language_code as string;
    }
    if (search) {
      filter.$or = [
        { title: { $regex: search as string, $options: "i" } },
        { content: { $regex: search as string, $options: "i" } },
      ];
    }

    const pageNum = Math.max(1, Number(page));
    const limitNum = Math.min(100, Math.max(1, Number(limit)));
    const skip = (pageNum - 1) * limitNum;

    const [advisories, total] = await Promise.all([
      AdvisoryContent.find(filter)
        .sort({ created_at: -1 })
        .skip(skip)
        .limit(limitNum),
      AdvisoryContent.countDocuments(filter),
    ]);

    res.status(200).json({
      success: true,
      data: advisories,
      count: advisories.length,
      total,
      page: pageNum,
      totalPages: Math.ceil(total / limitNum),
    });
  } catch (error) {
    next(error);
  }
};

export const getAdvisoryById = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { id } = req.params;

    const advisory = await AdvisoryContent.findOne({ id });

    if (!advisory) {
      res.status(404).json({
        success: false,
        message: "Advisory content not found",
      });
      return;
    }

    res.status(200).json({
      success: true,
      data: advisory,
    });
  } catch (error) {
    next(error);
  }
};

export const updateAdvisory = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { id } = req.params;
    const { title, content, source, language_code } = req.body;

    const advisory = await AdvisoryContent.findOne({ id });
    if (!advisory) {
      res.status(404).json({
        success: false,
        message: "Advisory content not found",
      });
      return;
    }

    const updateData: Partial<IAdvisoryContent> = {};
    if (title) updateData.title = title;
    if (content) updateData.content = content;
    if (source) updateData.source = source;
    if (language_code) updateData.language_code = language_code;

    const updatedAdvisory = await AdvisoryContent.findOneAndUpdate(
      { id },
      updateData,
      { new: true, runValidators: true },
    );

    // Create audit log for advisory update
    const userId = req.user?.userId || "admin";
    await createAuditLog(
      userId,
      AuditAction.ADMIN_ADVISORY_UPDATED,
      "AdvisoryContent",
      id,
    );

    res.status(200).json({
      success: true,
      data: updatedAdvisory,
    });
  } catch (error) {
    next(error);
  }
};

export const deleteAdvisory = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { id } = req.params;

    const advisory = await AdvisoryContent.findOne({ id });
    if (!advisory) {
      res.status(404).json({
        success: false,
        message: "Advisory content not found",
      });
      return;
    }

    await AdvisoryContent.deleteOne({ id });

    res.status(200).json({
      success: true,
      message: "Advisory content deleted successfully",
    });
  } catch (error) {
    next(error);
  }
};

export const bookmarkAdvisory = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { id } = req.params;
    const userId = req.user?.userId;

    if (!userId) {
      res.status(401).json({
        success: false,
        message: "User not authenticated",
      });
      return;
    }

    const advisory = await AdvisoryContent.findOne({ id });
    if (!advisory) {
      res.status(404).json({
        success: false,
        message: "Advisory content not found",
      });
      return;
    }

    res.status(200).json({
      success: true,
      message: "Advisory bookmarked successfully",
    });
  } catch (error) {
    next(error);
  }
};
