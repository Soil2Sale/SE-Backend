import { Request, Response, NextFunction } from "express";
import Offer, { IOffer, OfferStatus } from "../models/Offer";
import CropListing from "../models/CropListing";
import Order, { OrderStatus } from "../models/Order";
import User, { UserRole } from "../models/User";
import { FilterQuery } from "mongoose";
import { createAuditLog } from "../utils/auditLogger";
import { AuditAction } from "../models/AuditLog";
import { createNotification } from "./notificationController";
import { sendMSGViaTelegram } from "../middlewares/otp/otpSender";
import Notification, {
  NotificationReferenceType,
  NotificationType,
} from "../models/Notification";
import { off } from "process";

export const createOffer = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const {
      crop_listing_id,
      offered_price,
      buyer_user_id: buyer_user_id_from_body,
      farmer_user_id,
      status,
    } = req.body;
    const actor_user_id = req.user?.userId;

    if (!actor_user_id) {
      res.status(401).json({
        success: false,
        message: "User not authenticated",
      });
      return;
    }

    const buyer_user_id = buyer_user_id_from_body || actor_user_id;
    if (!buyer_user_id) {
      res.status(400).json({
        success: false,
        message: "buyer_user_id is required",
      });
      return;
    }

    const user = await User.findOne({ id: buyer_user_id });
    if (!user) {
      res.status(404).json({
        success: false,
        message: "User not found",
      });
      return;
    }

    if (user.role !== UserRole.BUYER) {
      res.status(403).json({
        success: false,
        message: "Only users with Buyer role can create offers",
      });
      return;
    }

    const listing = await CropListing.findOne({ id: crop_listing_id });
    if (!listing) {
      res.status(404).json({
        success: false,
        message: "Crop listing not found",
      });
      return;
    }

    if (listing.status !== "ACTIVE") {
      res.status(400).json({
        success: false,
        message: "Cannot make offer on inactive listing",
      });
      return;
    }

    const existingOffer = await Offer.findOne({
      crop_listing_id,
      buyer_user_id,
      status: OfferStatus.PENDING,
    });

    if (existingOffer) {
      res.status(400).json({
        success: false,
        message: "You already have a pending offer on this listing",
      });
      return;
    }

    if (status && !Object.values(OfferStatus).includes(status)) {
      res.status(400).json({
        success: false,
        message: "Invalid status value",
      });
      return;
    }

    const offer = await Offer.create({
      crop_listing_id,
      buyer_user_id,
      farmer_user_id,
      offered_price,
      status: status || OfferStatus.PENDING,
    });

    // Create audit log for offer creation
    await createAuditLog(
      buyer_user_id,
      AuditAction.OFFER_CREATED,
      "Offer",
      offer.id,
    );

    const farmerUser = await User.findOne({ id: farmer_user_id });
    if (farmerUser) {
      // Create notification for farmer
      await Notification.create({
        user_id: farmer_user_id,
        notification_type: NotificationType.ORDER_UPDATE,
        message: `You have received a new offer of ₹${offered_price} for your crop listing.`,
        delivery_method: "TELEGRAM",
        reference_type: NotificationReferenceType.ORDER,
        reference_id: offer.id,
      });

      // Send Telegram message to farmer
      if (farmerUser.telegram_chat_id) {
        await sendMSGViaTelegram(
          farmerUser.telegram_chat_id,
          `You have received a new offer of ₹${offered_price} for your crop listing.`,
        );
      }
    }

    res.status(201).json({
      success: true,
      data: offer,
    });
  } catch (error) {
    next(error);
  }
};

export const getOffersByListing = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { listingId } = req.params;
    const { status } = req.query;

    const filter: FilterQuery<IOffer> = { crop_listing_id: listingId };
    if (status) {
      filter.status = status as OfferStatus;
    }

    const offers = await Offer.find(filter)
      .populate({
        path: "buyer_user_id",
        foreignField: "id",
        select: "name email",
      })
      .sort({ created_at: -1 });

    res.status(200).json({
      success: true,
      data: offers,
      count: offers.length,
    });
  } catch (error) {
    next(error);
  }
};

export const getOffersByBuyer = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    console.log(req.user);
    const buyer_user_id = req.user?.userId;
    const { status, page = "1", limit = "20" } = req.query;

    if (!buyer_user_id) {
      res.status(401).json({
        success: false,
        message: "User not authenticated",
      });
      return;
    }

    const filter: FilterQuery<IOffer> = { buyer_user_id };
    if (status) {
      filter.status = status as OfferStatus;
    }

    const pageNum = Math.max(1, Number(page));
    const limitNum = Math.min(100, Math.max(1, Number(limit)));
    const skip = (pageNum - 1) * limitNum;

    const [offers, total] = await Promise.all([
      Offer.find(filter).sort({ created_at: -1 }).skip(skip).limit(limitNum),
      Offer.countDocuments(filter),
    ]);

    const offersWithListing = await Promise.all(
      offers.map(async (offer) => {
        const cropListing = await CropListing.findOne({
          id: offer.crop_listing_id,
        });
        return {
          ...offer.toObject(),
          crop_listing: cropListing
            ? {
                crop_name: cropListing.crop_name,
                quantity: cropListing.quantity,
                expected_price: cropListing.expected_price,
                quality_grade: cropListing.quality_grade,
                status: cropListing.status,
              }
            : null,
        };
      }),
    );

    res.status(200).json({
      success: true,
      data: offersWithListing,
      count: offersWithListing.length,
      total,
      page: pageNum,
      totalPages: Math.ceil(total / limitNum),
    });
  } catch (error) {
    next(error);
  }
};

export const getOffersBySeller = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const seller_user_id = req.user?.userId;
    const { status, page = "1", limit = "20" } = req.query;

    if (!seller_user_id) {
      res.status(401).json({
        success: false,
        message: "User not authenticated",
      });
      return;
    }

    const listings = await CropListing.find(
      { farmer_user_id: seller_user_id },
      { id: 1 },
    );
    const listingIds = listings.map((l) => l.id);

    const filter: FilterQuery<IOffer> = {
      crop_listing_id: { $in: listingIds },
    };
    if (status) {
      filter.status = status as OfferStatus;
    }

    const pageNum = Math.max(1, Number(page));
    const limitNum = Math.min(100, Math.max(1, Number(limit)));
    const skip = (pageNum - 1) * limitNum;

    const [offers, total] = await Promise.all([
      Offer.find(filter).sort({ created_at: -1 }).skip(skip).limit(limitNum),
      Offer.countDocuments(filter),
    ]);

    const offersWithListing = await Promise.all(
      offers.map(async (offer) => {
        const cropListing = await CropListing.findOne({
          id: offer.crop_listing_id,
        });
        return {
          ...offer.toObject(),
          crop_listing: cropListing
            ? {
                crop_name: cropListing.crop_name,
                quantity: cropListing.quantity,
                expected_price: cropListing.expected_price,
                quality_grade: cropListing.quality_grade,
                status: cropListing.status,
              }
            : null,
        };
      }),
    );

    res.status(200).json({
      success: true,
      data: offersWithListing,
      count: offersWithListing.length,
      total,
      page: pageNum,
      totalPages: Math.ceil(total / limitNum),
    });
  } catch (error) {
    next(error);
  }
};

export const getOfferById = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { id } = req.params;

    const offer = await Offer.findOne({ id })
      .populate({ path: "crop_listing_id", foreignField: "id" })
      .populate({
        path: "buyer_user_id",
        foreignField: "id",
        select: "name email phone_number",
      });

    if (!offer) {
      res.status(404).json({
        success: false,
        message: "Offer not found",
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

export const updateOffer = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { id } = req.params;
    const { offered_price } = req.body;
    const buyer_user_id = req.user?.userId;

    if (!buyer_user_id) {
      res.status(401).json({
        success: false,
        message: "User not authenticated",
      });
      return;
    }

    const offer = await Offer.findOne({ id });
    if (!offer) {
      res.status(404).json({
        success: false,
        message: "Offer not found",
      });
      return;
    }

    if (offer.buyer_user_id !== buyer_user_id) {
      res.status(403).json({
        success: false,
        message: "You can only update your own offers",
      });
      return;
    }

    if (
      offer.status !== OfferStatus.PENDING &&
      offer.status !== OfferStatus.WITHDRAWN
    ) {
      res.status(400).json({
        success: false,
        message: "Only pending/withdrawn offers can be updated",
      });
      return;
    }

    if (offered_price !== undefined) {
      offer.offered_price = offered_price;
      offer.status = OfferStatus.PENDING;
    }

    await offer.save();

    const farmerUser = await User.findOne({ id: offer.farmer_user_id });
    if (farmerUser) {
      // Create notification for farmer
      await Notification.create({
        user_id: offer.farmer_user_id,
        notification_type: NotificationType.ORDER_UPDATE,
        message: `The offer price has been updated to ₹${offer.offered_price} for your crop listing.`,
        delivery_method: "TELEGRAM",
        reference_type: NotificationReferenceType.ORDER,
        reference_id: offer.id,
      });

      // Send Telegram message to farmer
      if (farmerUser.telegram_chat_id) {
        await sendMSGViaTelegram(
          farmerUser.telegram_chat_id,
          `The offer price has been updated to ₹${offer.offered_price} for your crop listing.`,
        );
      }
    }

    res.status(200).json({
      success: true,
      data: offer,
    });
  } catch (error) {
    next(error);
  }
};

export const updateOfferStatus = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    const user_id = req.user?.userId;

    if (!user_id) {
      res.status(401).json({
        success: false,
        message: "User not authenticated",
      });
      return;
    }

    const offer = await Offer.findOne({ id }).populate({
      path: "crop_listing_id",
      foreignField: "id",
    });
    if (!offer) {
      res.status(404).json({
        success: false,
        message: "Offer not found",
      });
      return;
    }

    const listing = offer.crop_listing_id as typeof CropListing.prototype;
    if (status === OfferStatus.ACCEPTED || status === OfferStatus.REJECTED) {
      if (listing.farmer_user_id !== user_id) {
        res.status(403).json({
          success: false,
          message: "Only seller can accept or reject offers",
        });
        return;
      }
    }

    if (status === OfferStatus.WITHDRAWN) {
      if (offer.buyer_user_id !== user_id) {
        res.status(403).json({
          success: false,
          message: "Only buyer can withdraw offer",
        });
        return;
      }
    }

    if (offer.status !== OfferStatus.PENDING) {
      res.status(400).json({
        success: false,
        message: `Cannot update offer with status ${offer.status}`,
      });
      return;
    }

    offer.status = status;
    await offer.save();

    // Create audit log for offer status change
    if (status === OfferStatus.ACCEPTED) {
      await createAuditLog(
        user_id,
        AuditAction.OFFER_ACCEPTED,
        "Offer",
        offer.id,
      );

      // Automatically create an order when offer is accepted
      const cropListing = offer.crop_listing_id as any;
      const order = await Order.create({
        crop_listing_id: cropListing.id ?? cropListing,
        buyer_user_id: offer.buyer_user_id,
        sender_user_id: offer.farmer_user_id,
        final_price: offer.offered_price,
        quantity: cropListing.quantity ?? 0,
        status: OrderStatus.CONFIRMED,
        payment_status: "PENDING",
      });

      await createAuditLog(
        user_id,
        AuditAction.ORDER_CREATED,
        "Order",
        order.id,
      );
    } else if (status === OfferStatus.REJECTED) {
      await createAuditLog(
        user_id,
        AuditAction.OFFER_REJECTED,
        "Offer",
        offer.id,
      );
    }

    const buyerUser = await User.findOne({ id: offer.buyer_user_id });
    if (buyerUser) {
      // Create notification for buyer
      await Notification.create({
        user_id: offer.buyer_user_id,
        notification_type: NotificationType.ORDER_UPDATE,
        message: `The offer status has been updated to ${status} for your crop listing.`,
        delivery_method: "TELEGRAM",
        reference_type: NotificationReferenceType.ORDER,
        reference_id: offer.id,
      });

      // Send Telegram message to buyer
      if (buyerUser.telegram_chat_id) {
        await sendMSGViaTelegram(
          buyerUser.telegram_chat_id,
          `The offer status has been updated to ${status} for your crop listing.`,
        );
      }
    }

    res.status(200).json({
      success: true,
      data: offer,
    });
  } catch (error) {
    next(error);
  }
};

export const withdrawOffer = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { id } = req.params;
    const buyer_user_id = req.user?.userId;

    if (!buyer_user_id) {
      res.status(401).json({
        success: false,
        message: "User not authenticated",
      });
      return;
    }

    const offer = await Offer.findOne({ id });
    if (!offer) {
      res.status(404).json({
        success: false,
        message: "Offer not found",
      });
      return;
    }

    if (offer.buyer_user_id !== buyer_user_id) {
      res.status(403).json({
        success: false,
        message: "You can only withdraw your own offers",
      });
      return;
    }

    if (offer.status !== OfferStatus.PENDING) {
      res.status(400).json({
        success: false,
        message: "Only pending offers can be withdrawn",
      });
      return;
    }

    offer.status = OfferStatus.WITHDRAWN;
    await offer.save();

    const farmerUser = await User.findOne({ id: offer.farmer_user_id });
    if (farmerUser) {
      // Create notification for farmer
      await Notification.create({
        user_id: offer.farmer_user_id,
        notification_type: NotificationType.ORDER_UPDATE,
        message: `The offer has been withdrawn for your crop listing.`,
        delivery_method: "TELEGRAM",
        reference_type: NotificationReferenceType.ORDER,
        reference_id: offer.id,
      });

      // Send Telegram message to farmer
      if (farmerUser.telegram_chat_id) {
        await sendMSGViaTelegram(
          farmerUser.telegram_chat_id,
          `The offer has been withdrawn for your crop listing.`,
        );
      }
    }

    res.status(200).json({
      success: true,
      data: offer,
    });
  } catch (error) {
    next(error);
  }
};
