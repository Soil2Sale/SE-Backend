import { Request, Response, NextFunction } from "express";
import AuditLog, { IAuditLog, AuditAction } from "../models/AuditLog";
import { FilterQuery } from "mongoose";

export const createAuditLog = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { action, entity_type, entity_id } = req.body;
    const user_id = req.user?.userId;

    if (!user_id) {
      res.status(401).json({
        success: false,
        message: "User not authenticated",
      });
      return;
    }

    const auditLog = await AuditLog.create({
      user_id,
      action,
      entity_type,
      entity_id,
    });

    res.status(201).json({
      success: true,
      data: auditLog,
    });
  } catch (error) {
    next(error);
  }
};

export const getAuditLogs = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const {
      user_id,
      action,
      entity_type,
      entity_id,
      from,
      to,
      page = "1",
      limit = "50",
    } = req.query;

    const filter: FilterQuery<IAuditLog> = {};
    if (user_id) {
      filter.user_id = user_id as string;
    }
    if (action) {
      filter.action = action as AuditAction;
    }
    if (entity_type) {
      filter.entity_type = entity_type as string;
    }
    if (entity_id) {
      filter.entity_id = entity_id as string;
    }

    if (from || to) {
      filter.created_at = {};
      if (from) {
        filter.created_at.$gte = new Date(from as string);
      }
      if (to) {
        filter.created_at.$lte = new Date(to as string);
      }
    }

    const pageNum = Math.max(1, Number(page));
    const limitNum = Math.min(100, Math.max(1, Number(limit)));
    const skip = (pageNum - 1) * limitNum;

    const [logs, total] = await Promise.all([
      AuditLog.find(filter)
        .populate("user_id", "name email")
        .sort({ created_at: -1 })
        .skip(skip)
        .limit(limitNum),
      AuditLog.countDocuments(filter),
    ]);

    res.status(200).json({
      success: true,
      data: logs,
      count: logs.length,
      total,
      page: pageNum,
      totalPages: Math.ceil(total / limitNum),
    });
  } catch (error) {
    next(error);
  }
};

export const getAuditLogById = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { id } = req.params;

    const auditLog = await AuditLog.findOne({ id }).populate(
      "user_id",
      "name email",
    );

    if (!auditLog) {
      res.status(404).json({
        success: false,
        message: "Audit log not found",
      });
      return;
    }

    res.status(200).json({
      success: true,
      data: auditLog,
    });
  } catch (error) {
    next(error);
  }
};

export const getAuditLogsByEntity = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { entityType, entityId } = req.params;
    const { page = "1", limit = "50" } = req.query;

    const filter: FilterQuery<IAuditLog> = {
      entity_type: entityType,
      entity_id: entityId,
    };

    const pageNum = Math.max(1, Number(page));
    const limitNum = Math.min(100, Math.max(1, Number(limit)));
    const skip = (pageNum - 1) * limitNum;

    const [logs, total] = await Promise.all([
      AuditLog.find(filter)
        .populate("user_id", "name email")
        .sort({ created_at: -1 })
        .skip(skip)
        .limit(limitNum),
      AuditLog.countDocuments(filter),
    ]);

    res.status(200).json({
      success: true,
      data: logs,
      count: logs.length,
      total,
      page: pageNum,
      totalPages: Math.ceil(total / limitNum),
    });
  } catch (error) {
    next(error);
  }
};

export const getAuditLogsByUser = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { userId } = req.params;
    const { action, from, to, page = "1", limit = "50" } = req.query;

    const filter: FilterQuery<IAuditLog> = { user_id: userId };
    if (action) {
      filter.action = action as AuditAction;
    }

    if (from || to) {
      filter.created_at = {};
      if (from) {
        filter.created_at.$gte = new Date(from as string);
      }
      if (to) {
        filter.created_at.$lte = new Date(to as string);
      }
    }

    const pageNum = Math.max(1, Number(page));
    const limitNum = Math.min(100, Math.max(1, Number(limit)));
    const skip = (pageNum - 1) * limitNum;

    const [logs, total] = await Promise.all([
      AuditLog.find(filter).sort({ created_at: -1 }).skip(skip).limit(limitNum),
      AuditLog.countDocuments(filter),
    ]);

    res.status(200).json({
      success: true,
      data: logs,
      count: logs.length,
      total,
      page: pageNum,
      totalPages: Math.ceil(total / limitNum),
    });
  } catch (error) {
    next(error);
  }
};

export const getAuditStatsByAction = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { from, to } = req.query;

    const matchFilter: FilterQuery<IAuditLog> = {};
    if (from || to) {
      matchFilter.created_at = {};
      if (from) {
        matchFilter.created_at.$gte = new Date(from as string);
      }
      if (to) {
        matchFilter.created_at.$lte = new Date(to as string);
      }
    }

    const stats = await AuditLog.aggregate([
      { $match: matchFilter },
      {
        $group: {
          _id: "$action",
          count: { $sum: 1 },
          lastOccurred: { $max: "$created_at" },
        },
      },
      { $sort: { count: -1 } },
    ]);

    res.status(200).json({
      success: true,
      data: stats,
      count: stats.length,
    });
  } catch (error) {
    next(error);
  }
};
