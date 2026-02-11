import { Request, Response, NextFunction } from "express";
import Dispute, { IDispute, DisputeStatus } from "../models/Dispute";
import DisputeEvidence from "../models/DisputeEvidence";
import Order from "../models/Order";
import { FilterQuery } from "mongoose";
import { createAuditLog } from "../utils/auditLogger";
import { AuditAction } from "../models/AuditLog";

export const createDispute = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { order_id, description } = req.body;
    const raised_by_user_id = req.user?.userId;

    if (!raised_by_user_id) {
      res.status(401).json({
        success: false,
        message: "User not authenticated",
      });
      return;
    }

    const order = await Order.findOne({ id: order_id });
    if (!order) {
      res.status(404).json({
        success: false,
        message: "Order not found",
      });
      return;
    }

    if (
      order.buyer_user_id !== raised_by_user_id &&
      order.sender_user_id !== raised_by_user_id
    ) {
      res.status(403).json({
        success: false,
        message: "You are not authorized to raise dispute for this order",
      });
      return;
    }

    const existingDispute = await Dispute.findOne({ order_id });
    if (existingDispute) {
      res.status(400).json({
        success: false,
        message: "A dispute already exists for this order",
      });
      return;
    }

    const dispute = await Dispute.create({
      order_id,
      raised_by_user_id,
      description,
      status: DisputeStatus.OPEN,
    });

    // Create audit log for dispute creation
    await createAuditLog(
      raised_by_user_id,
      AuditAction.DISPUTE_RAISED,
      "Dispute",
      dispute.id,
    );

    res.status(201).json({
      success: true,
      data: dispute,
    });
  } catch (error) {
    next(error);
  }
};

export const getDisputesByUser = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const user_id = req.user?.userId;
    const { status, page = "1", limit = "20" } = req.query;

    if (!user_id) {
      res.status(401).json({
        success: false,
        message: "User not authenticated",
      });
      return;
    }

    const orders = await Order.find(
      {
        $or: [{ buyer_user_id: user_id }, { sender_user_id: user_id }],
      },
      { id: 1 },
    );
    const orderIds = orders.map((o) => o.id);

    const filter: FilterQuery<IDispute> = {
      $or: [{ raised_by_user_id: user_id }, { order_id: { $in: orderIds } }],
    };

    if (status) {
      filter.status = status as DisputeStatus;
    }

    const pageNum = Math.max(1, Number(page));
    const limitNum = Math.min(100, Math.max(1, Number(limit)));
    const skip = (pageNum - 1) * limitNum;

    const [disputes, total] = await Promise.all([
      Dispute.find(filter)
        .populate("order_id")
        .populate("raised_by_user_id", "name email")
        .sort({ created_at: -1 })
        .skip(skip)
        .limit(limitNum),
      Dispute.countDocuments(filter),
    ]);

    res.status(200).json({
      success: true,
      data: disputes,
      count: disputes.length,
      total,
      page: pageNum,
      totalPages: Math.ceil(total / limitNum),
    });
  } catch (error) {
    next(error);
  }
};

export const getDisputesByOrder = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { orderId } = req.params;

    const disputes = await Dispute.find({ order_id: orderId })
      .populate("raised_by_user_id", "name email")
      .sort({ created_at: -1 });

    res.status(200).json({
      success: true,
      data: disputes,
      count: disputes.length,
    });
  } catch (error) {
    next(error);
  }
};

export const getDisputeById = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { id } = req.params;

    const dispute = await Dispute.findOne({ id })
      .populate("order_id")
      .populate("raised_by_user_id", "name email phone_number");

    if (!dispute) {
      res.status(404).json({
        success: false,
        message: "Dispute not found",
      });
      return;
    }

    const evidence = await DisputeEvidence.find({ dispute_id: id })
      .populate("user_id", "name email")
      .sort({ created_at: 1 });

    res.status(200).json({
      success: true,
      data: {
        dispute,
        evidence,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const updateDisputeStatus = async (
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

    const dispute = await Dispute.findOne({ id });
    if (!dispute) {
      res.status(404).json({
        success: false,
        message: "Dispute not found",
      });
      return;
    }

    if (
      dispute.status === DisputeStatus.RESOLVED ||
      dispute.status === DisputeStatus.REJECTED
    ) {
      res.status(400).json({
        success: false,
        message: `Cannot update dispute with status ${dispute.status}`,
      });
      return;
    }

    dispute.status = status;
    await dispute.save();

    // Create audit log for dispute status change
    // Check if this is an admin action based on user role
    const user = req.user as any;
    const action =
      user?.role === "ADMIN"
        ? AuditAction.ADMIN_DISPUTE_ACTION
        : AuditAction.DISPUTE_STATUS_CHANGED;

    await createAuditLog(user_id, action, "Dispute", dispute.id);

    res.status(200).json({
      success: true,
      data: dispute,
    });
  } catch (error) {
    next(error);
  }
};

export const addDisputeEvidence = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { id } = req.params;
    const { file_url, description } = req.body;
    const user_id = req.user?.userId;

    if (!user_id) {
      res.status(401).json({
        success: false,
        message: "User not authenticated",
      });
      return;
    }

    const dispute = await Dispute.findOne({ id }).populate("order_id");
    if (!dispute) {
      res.status(404).json({
        success: false,
        message: "Dispute not found",
      });
      return;
    }

    const order = dispute.order_id as typeof Order.prototype;
    if (
      dispute.raised_by_user_id !== user_id &&
      order.buyer_user_id !== user_id &&
      order.sender_user_id !== user_id
    ) {
      res.status(403).json({
        success: false,
        message: "You are not authorized to add evidence to this dispute",
      });
      return;
    }

    const evidence = await DisputeEvidence.create({
      dispute_id: id,
      user_id,
      file_url,
      description,
    });

    res.status(201).json({
      success: true,
      data: evidence,
    });
  } catch (error) {
    next(error);
  }
};
