import { Request, Response, NextFunction } from "express";
import NegotiationLog, { INegotiationLog } from "../models/NegotiationLog";
import Offer from "../models/Offer";
import CropListing from "../models/CropListing";
import { FilterQuery } from "mongoose";
import { createAuditLog } from "../utils/auditLogger";
import { AuditAction } from "../models/AuditLog";

export const createNegotiation = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { offer_id, proposed_price, message } = req.body;
    const user_id = req.user?.userId;

    if (!user_id) {
      res.status(401).json({
        success: false,
        message: "User not authenticated",
      });
      return;
    }

    const offer = await Offer.findOne({ id: offer_id }).populate(
      "crop_listing_id",
    );
    if (!offer) {
      res.status(404).json({
        success: false,
        message: "Offer not found",
      });
      return;
    }

    const listing = offer.crop_listing_id as typeof CropListing.prototype;
    const isBuyer = offer.buyer_user_id === user_id;
    const isSeller = listing.farmer_user_id === user_id;

    if (!isBuyer && !isSeller) {
      res.status(403).json({
        success: false,
        message: "You are not authorized to negotiate on this offer",
      });
      return;
    }

    const negotiation = await NegotiationLog.create({
      offer_id,
      user_id,
      proposed_price,
      message,
    });

    // Check if this is the first negotiation for this offer to log NEGOTIATION_STARTED
    const negotiationCount = await NegotiationLog.countDocuments({ offer_id });
    if (negotiationCount === 1) {
      await createAuditLog(
        user_id,
        AuditAction.NEGOTIATION_STARTED,
        "NegotiationLog",
        negotiation.id,
      );
    }

    res.status(201).json({
      success: true,
      data: negotiation,
    });
  } catch (error) {
    next(error);
  }
};

export const getNegotiationsByOffer = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { offerId } = req.params;

    const negotiations = await NegotiationLog.find({ offer_id: offerId })
      .populate("user_id", "name email")
      .sort({ created_at: 1 });

    res.status(200).json({
      success: true,
      data: negotiations,
      count: negotiations.length,
    });
  } catch (error) {
    next(error);
  }
};

export const getNegotiationsByUser = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const user_id = req.user?.userId;
    const { page = "1", limit = "20" } = req.query;

    if (!user_id) {
      res.status(401).json({
        success: false,
        message: "User not authenticated",
      });
      return;
    }

    const pageNum = Math.max(1, Number(page));
    const limitNum = Math.min(100, Math.max(1, Number(limit)));
    const skip = (pageNum - 1) * limitNum;

    const [negotiations, total] = await Promise.all([
      NegotiationLog.find({ user_id })
        .populate("offer_id")
        .sort({ created_at: -1 })
        .skip(skip)
        .limit(limitNum),
      NegotiationLog.countDocuments({ user_id }),
    ]);

    res.status(200).json({
      success: true,
      data: negotiations,
      count: negotiations.length,
      total,
      page: pageNum,
      totalPages: Math.ceil(total / limitNum),
    });
  } catch (error) {
    next(error);
  }
};
