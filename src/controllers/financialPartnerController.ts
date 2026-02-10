import { Request, Response, NextFunction } from "express";
import FinancialPartner, {
  IFinancialPartner,
  FinancialPartnerType,
} from "../models/FinancialPartner";
import { FilterQuery } from "mongoose";

export const createFinancialPartner = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { name, type } = req.body;
    const user_id = req.user?.userId;

    if (!user_id) {
      res.status(401).json({
        success: false,
        message: "User not authenticated",
      });
      return;
    }

    const existingPartner = await FinancialPartner.findOne({ user_id });
    if (existingPartner) {
      res.status(400).json({
        success: false,
        message: "Financial partner profile already exists for this user",
      });
      return;
    }

    const partner = await FinancialPartner.create({
      user_id,
      name,
      type,
    });

    res.status(201).json({
      success: true,
      data: partner,
    });
  } catch (error) {
    next(error);
  }
};

export const getFinancialPartners = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { type, page = "1", limit = "20" } = req.query;

    const filter: FilterQuery<IFinancialPartner> = {};
    if (type) {
      filter.type = type as FinancialPartnerType;
    }

    const pageNum = Math.max(1, Number(page));
    const limitNum = Math.min(100, Math.max(1, Number(limit)));
    const skip = (pageNum - 1) * limitNum;

    const [partners, total] = await Promise.all([
      FinancialPartner.find(filter)
        .populate("user_id", "name email phone_number")
        .sort({ created_at: -1 })
        .skip(skip)
        .limit(limitNum),
      FinancialPartner.countDocuments(filter),
    ]);

    res.status(200).json({
      success: true,
      data: partners,
      count: partners.length,
      total,
      page: pageNum,
      totalPages: Math.ceil(total / limitNum),
    });
  } catch (error) {
    next(error);
  }
};

export const getFinancialPartnerById = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { id } = req.params;

    const partner = await FinancialPartner.findOne({ id }).populate(
      "user_id",
      "name email phone_number",
    );

    if (!partner) {
      res.status(404).json({
        success: false,
        message: "Financial partner not found",
      });
      return;
    }

    res.status(200).json({
      success: true,
      data: partner,
    });
  } catch (error) {
    next(error);
  }
};

export const getFinancialPartnerByUser = async (
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

    const partner = await FinancialPartner.findOne({ user_id }).populate(
      "user_id",
      "name email phone_number",
    );

    if (!partner) {
      res.status(404).json({
        success: false,
        message: "Financial partner profile not found",
      });
      return;
    }

    res.status(200).json({
      success: true,
      data: partner,
    });
  } catch (error) {
    next(error);
  }
};

export const updateFinancialPartner = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { id } = req.params;
    const { name, type } = req.body;
    const user_id = req.user?.userId;

    if (!user_id) {
      res.status(401).json({
        success: false,
        message: "User not authenticated",
      });
      return;
    }

    const partner = await FinancialPartner.findOne({ id });
    if (!partner) {
      res.status(404).json({
        success: false,
        message: "Financial partner not found",
      });
      return;
    }

    if (partner.user_id !== user_id) {
      res.status(403).json({
        success: false,
        message: "You are not authorized to update this profile",
      });
      return;
    }

    const updateData: Partial<IFinancialPartner> = {};
    if (name) updateData.name = name;
    if (type) updateData.type = type;

    const updatedPartner = await FinancialPartner.findOneAndUpdate(
      { id },
      updateData,
      { new: true, runValidators: true },
    );

    res.status(200).json({
      success: true,
      data: updatedPartner,
    });
  } catch (error) {
    next(error);
  }
};
