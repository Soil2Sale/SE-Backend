import { Request, Response, NextFunction } from "express";
import Order, { IOrder, OrderStatus } from "../models/Order";
import CropListing from "../models/CropListing";
import User, { UserRole } from "../models/User";
import { FilterQuery } from "mongoose";
import { createAuditLog } from "../utils/auditLogger";
import { AuditAction } from "../models/AuditLog";

export const createOrder = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { crop_listing_id, final_price, quantity } = req.body;
    const buyer_user_id = req.user?.userId;

    if (!buyer_user_id) {
      res.status(401).json({
        success: false,
        message: "User not authenticated",
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
        message: "Only users with Buyer role can create orders",
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
        message: "Cannot create order for inactive listing",
      });
      return;
    }

    if (listing.quantity < quantity) {
      res.status(400).json({
        success: false,
        message: "Insufficient quantity available",
      });
      return;
    }

    const order = await Order.create({
      crop_listing_id,
      buyer_user_id,
      sender_user_id: listing.farmer_user_id,
      final_price,
      quantity,
      status: OrderStatus.CREATED,
      payment_status: "PENDING",
    });

    listing.quantity -= quantity;
    await listing.save();

    // Create audit log for order creation
    await createAuditLog(
      buyer_user_id,
      AuditAction.ORDER_CREATED,
      "Order",
      order.id,
    );

    res.status(201).json({
      success: true,
      data: order,
    });
  } catch (error) {
    next(error);
  }
};

export const getOrdersByBuyer = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const buyer_user_id = req.user?.userId;
    const { status, page = "1", limit = "20" } = req.query;

    if (!buyer_user_id) {
      res.status(401).json({
        success: false,
        message: "User not authenticated",
      });
      return;
    }

    const filter: FilterQuery<IOrder> = { buyer_user_id };
    if (status) {
      filter.status = status as OrderStatus;
    }

    const pageNum = Math.max(1, Number(page));
    const limitNum = Math.min(100, Math.max(1, Number(limit)));
    const skip = (pageNum - 1) * limitNum;

    const [orders, total] = await Promise.all([
      Order.find(filter)
        .populate("crop_listing_id", "crop_type price_per_kg quality_grade")
        .populate("sender_user_id", "name email phone_number")
        .sort({ created_at: -1 })
        .skip(skip)
        .limit(limitNum),
      Order.countDocuments(filter),
    ]);

    res.status(200).json({
      success: true,
      data: orders,
      count: orders.length,
      total,
      page: pageNum,
      totalPages: Math.ceil(total / limitNum),
    });
  } catch (error) {
    next(error);
  }
};

export const getOrdersBySeller = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const sender_user_id = req.user?.userId;
    const { status, page = "1", limit = "20" } = req.query;

    if (!sender_user_id) {
      res.status(401).json({
        success: false,
        message: "User not authenticated",
      });
      return;
    }

    const filter: FilterQuery<IOrder> = { sender_user_id };
    if (status) {
      filter.status = status as OrderStatus;
    }

    const pageNum = Math.max(1, Number(page));
    const limitNum = Math.min(100, Math.max(1, Number(limit)));
    const skip = (pageNum - 1) * limitNum;

    const [orders, total] = await Promise.all([
      Order.find(filter)
        .populate("crop_listing_id", "crop_type price_per_kg quality_grade")
        .populate("buyer_user_id", "name email phone_number")
        .sort({ created_at: -1 })
        .skip(skip)
        .limit(limitNum),
      Order.countDocuments(filter),
    ]);

    res.status(200).json({
      success: true,
      data: orders,
      count: orders.length,
      total,
      page: pageNum,
      totalPages: Math.ceil(total / limitNum),
    });
  } catch (error) {
    next(error);
  }
};

export const getOrderById = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { id } = req.params;

    const order = await Order.findOne({ id })
      .populate("crop_listing_id")
      .populate("buyer_user_id", "name email phone_number")
      .populate("sender_user_id", "name email phone_number");

    if (!order) {
      res.status(404).json({
        success: false,
        message: "Order not found",
      });
      return;
    }

    res.status(200).json({
      success: true,
      data: order,
    });
  } catch (error) {
    next(error);
  }
};

export const updateOrderStatus = async (
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

    const order = await Order.findOne({ id });
    if (!order) {
      res.status(404).json({
        success: false,
        message: "Order not found",
      });
      return;
    }

    if (order.buyer_user_id !== user_id && order.sender_user_id !== user_id) {
      res.status(403).json({
        success: false,
        message: "You are not authorized to update this order",
      });
      return;
    }

    if (
      order.status === OrderStatus.COMPLETED ||
      order.status === OrderStatus.CANCELLED
    ) {
      res.status(400).json({
        success: false,
        message: `Cannot update order with status ${order.status}`,
      });
      return;
    }

    order.status = status;
    await order.save();

    // Create audit log for order status change
    await createAuditLog(
      user_id,
      AuditAction.ORDER_STATUS_CHANGED,
      "Order",
      order.id,
    );

    res.status(200).json({
      success: true,
      data: order,
    });
  } catch (error) {
    next(error);
  }
};

export const updatePaymentStatus = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { id } = req.params;
    const { payment_status } = req.body;
    const user_id = req.user?.userId;

    if (!user_id) {
      res.status(401).json({
        success: false,
        message: "User not authenticated",
      });
      return;
    }

    if (!payment_status) {
      res.status(400).json({
        success: false,
        message: "payment_status is required",
      });
      return;
    }

    const order = await Order.findOne({ id });
    if (!order) {
      res.status(404).json({
        success: false,
        message: "Order not found",
      });
      return;
    }

    order.payment_status = payment_status;
    await order.save();

    res.status(200).json({
      success: true,
      data: order,
    });
  } catch (error) {
    next(error);
  }
};

export const cancelOrder = async (
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

    const order = await Order.findOne({ id });
    if (!order) {
      res.status(404).json({
        success: false,
        message: "Order not found",
      });
      return;
    }

    if (order.buyer_user_id !== user_id && order.sender_user_id !== user_id) {
      res.status(403).json({
        success: false,
        message: "You are not authorized to cancel this order",
      });
      return;
    }

    if (order.status === OrderStatus.COMPLETED) {
      res.status(400).json({
        success: false,
        message: "Cannot cancel completed order",
      });
      return;
    }

    if (order.status === OrderStatus.CANCELLED) {
      res.status(400).json({
        success: false,
        message: "Order is already cancelled",
      });
      return;
    }

    order.status = OrderStatus.CANCELLED;
    await order.save();

    const listing = await CropListing.findOne({ id: order.crop_listing_id });
    if (listing) {
      listing.quantity += order.quantity;
      await listing.save();
    }

    res.status(200).json({
      success: true,
      data: order,
    });
  } catch (error) {
    next(error);
  }
};
