import { Request, Response, NextFunction } from "express";
import CreditOffer, { ICreditOffer, LoanType } from "../models/CreditOffer";
import FinancialPartner from "../models/FinancialPartner";
import { FilterQuery } from "mongoose";

export const createCreditOffer = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const {
      farmer_user_id,
      loan_type,
      interest_rate,
      max_amount,
      financial_partner_id,
    } = req.body;
    const user_id = req.user?.userId;
    const user = req.user as any;

    if (!user_id) {
      res.status(401).json({
        success: false,
        message: "User not authenticated",
      });
      return;
    }

    if (!farmer_user_id || !loan_type || interest_rate === undefined || max_amount === undefined) {
      res.status(400).json({
        success: false,
        message:
          "All fields are required: farmer_user_id, loan_type, interest_rate, max_amount",
      });
      return;
    }

    const isAdmin = user?.role === "Admin";
    let partner_id: string;

    if (isAdmin && financial_partner_id) {
      partner_id = financial_partner_id;
    } else {
      const partner = await FinancialPartner.findOne({ user_id });
      if (!partner) {
        res.status(404).json({
          success: false,
          message: "Financial partner profile not found",
        });
        return;
      }
      partner_id = partner.id;
    }

    const offer = await CreditOffer.create({
      financial_partner_id: partner_id,
      farmer_user_id,
      loan_type,
      interest_rate,
      max_amount,
    });

    res.status(201).json({
      success: true,
      data: offer,
    });
  } catch (error) {
    next(error);
  }
};

export const getCreditOffers = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const {
      loan_type,
      min_amount,
      max_amount,
      page = "1",
      limit = "20",
    } = req.query;

    const filter: FilterQuery<ICreditOffer> = {};
    if (loan_type) {
      filter.loan_type = loan_type as LoanType;
    }

    if (min_amount || max_amount) {
      filter.max_amount = {};
      if (min_amount) {
        filter.max_amount.$gte = Number(min_amount);
      }
      if (max_amount) {
        filter.max_amount.$lte = Number(max_amount);
      }
    }

    const pageNum = Math.max(1, Number(page));
    const limitNum = Math.min(100, Math.max(1, Number(limit)));
    const skip = (pageNum - 1) * limitNum;

    const [offers, total] = await Promise.all([
      CreditOffer.find(filter)
        .populate("financial_partner_id", "name type")
        .populate("farmer_user_id", "name email")
        .sort({ created_at: -1 })
        .skip(skip)
        .limit(limitNum),
      CreditOffer.countDocuments(filter),
    ]);

    res.status(200).json({
      success: true,
      data: offers,
      count: offers.length,
      total,
      page: pageNum,
      totalPages: Math.ceil(total / limitNum),
    });
  } catch (error) {
    next(error);
  }
};

export const getCreditOfferById = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { id } = req.params;

    const offer = await CreditOffer.findOne({ id })
      .populate("financial_partner_id", "name type")
      .populate("farmer_user_id", "name email phone_number");

    if (!offer) {
      res.status(404).json({
        success: false,
        message: "Credit offer not found",
      });
      return;
    }

    res.status(200).json({
      success: true,
      data: offer,
    });
  } catch (error) {
    next(error);
  }
};

export const getCreditOffersByFarmer = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const farmer_user_id = req.user?.userId;
    const { loan_type, page = "1", limit = "20" } = req.query;

    if (!farmer_user_id) {
      res.status(401).json({
        success: false,
        message: "User not authenticated",
      });
      return;
    }

    const filter: FilterQuery<ICreditOffer> = { farmer_user_id };
    if (loan_type) {
      filter.loan_type = loan_type as LoanType;
    }

    const pageNum = Math.max(1, Number(page));
    const limitNum = Math.min(100, Math.max(1, Number(limit)));
    const skip = (pageNum - 1) * limitNum;

    const [offers, total] = await Promise.all([
      CreditOffer.find(filter)
        .populate("financial_partner_id", "name type")
        .sort({ created_at: -1 })
        .skip(skip)
        .limit(limitNum),
      CreditOffer.countDocuments(filter),
    ]);

    res.status(200).json({
      success: true,
      data: offers,
      count: offers.length,
      total,
      page: pageNum,
      totalPages: Math.ceil(total / limitNum),
    });
  } catch (error) {
    next(error);
  }
};

export const getCreditOffersByPartner = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const user_id = req.user?.userId;
    const { loan_type, page = "1", limit = "20" } = req.query;

    if (!user_id) {
      res.status(401).json({
        success: false,
        message: "User not authenticated",
      });
      return;
    }

    const partner = await FinancialPartner.findOne({ user_id });
    if (!partner) {
      res.status(404).json({
        success: false,
        message: "Financial partner profile not found",
      });
      return;
    }

    const filter: FilterQuery<ICreditOffer> = {
      financial_partner_id: partner.id,
    };
    if (loan_type) {
      filter.loan_type = loan_type as LoanType;
    }

    const pageNum = Math.max(1, Number(page));
    const limitNum = Math.min(100, Math.max(1, Number(limit)));
    const skip = (pageNum - 1) * limitNum;

    const [offers, total] = await Promise.all([
      CreditOffer.find(filter)
        .populate("farmer_user_id", "name email")
        .sort({ created_at: -1 })
        .skip(skip)
        .limit(limitNum),
      CreditOffer.countDocuments(filter),
    ]);

    res.status(200).json({
      success: true,
      data: offers,
      count: offers.length,
      total,
      page: pageNum,
      totalPages: Math.ceil(total / limitNum),
    });
  } catch (error) {
    next(error);
  }
};

export const updateCreditOffer = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { id } = req.params;
    const { loan_type, interest_rate, max_amount } = req.body;
    const user_id = req.user?.userId;

    if (!user_id) {
      res.status(401).json({
        success: false,
        message: "User not authenticated",
      });
      return;
    }

    const partner = await FinancialPartner.findOne({ user_id });
    if (!partner) {
      res.status(404).json({
        success: false,
        message: "Financial partner profile not found",
      });
      return;
    }

    const offer = await CreditOffer.findOne({ id });
    if (!offer) {
      res.status(404).json({
        success: false,
        message: "Credit offer not found",
      });
      return;
    }

    if (offer.financial_partner_id !== partner.id) {
      res.status(403).json({
        success: false,
        message: "You are not authorized to update this offer",
      });
      return;
    }

    const updateData: Partial<ICreditOffer> = {};
    if (loan_type) updateData.loan_type = loan_type;
    if (interest_rate !== undefined) updateData.interest_rate = interest_rate;
    if (max_amount !== undefined) updateData.max_amount = max_amount;

    const updatedOffer = await CreditOffer.findOneAndUpdate(
      { id },
      updateData,
      {
        new: true,
        runValidators: true,
      },
    );

    res.status(200).json({
      success: true,
      data: updatedOffer,
    });
  } catch (error) {
    next(error);
  }
};

export const deleteCreditOffer = async (
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

    const partner = await FinancialPartner.findOne({ user_id });
    if (!partner) {
      res.status(404).json({
        success: false,
        message: "Financial partner profile not found",
      });
      return;
    }

    const offer = await CreditOffer.findOne({ id });
    if (!offer) {
      res.status(404).json({
        success: false,
        message: "Credit offer not found",
      });
      return;
    }

    if (offer.financial_partner_id !== partner.id) {
      res.status(403).json({
        success: false,
        message: "You are not authorized to delete this offer",
      });
      return;
    }

    await CreditOffer.findOneAndDelete({ id });

    res.status(200).json({
      success: true,
      message: "Credit offer deleted successfully",
    });
  } catch (error) {
    next(error);
  }
};
