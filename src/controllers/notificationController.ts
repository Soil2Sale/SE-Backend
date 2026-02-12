import { Request, Response, NextFunction } from "express";
import Notification, {
  INotification,
  NotificationType,
  NotificationReferenceType,
} from "../models/Notification";
import { FilterQuery } from "mongoose";
import { createAuditLog } from "../utils/auditLogger";
import { AuditAction } from "../models/AuditLog";

export const createNotification = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const payload = Array.isArray(req.body) ? req.body : [req.body];

    // Validate all entries
    for (let i = 0; i < payload.length; i += 1) {
      const {
        user_id,
        notification_type,
        message,
        delivery_method,
        reference_type,
        reference_id,
      } = payload[i];

      if (
        !user_id ||
        !notification_type ||
        !message ||
        !delivery_method ||
        !reference_type ||
        !reference_id
      ) {
        res.status(400).json({
          success: false,
          message: `Missing required fields in entry ${i + 1}`,
        });
        return;
      }

      if (!Object.values(NotificationType).includes(notification_type)) {
        res.status(400).json({
          success: false,
          message: `Invalid notification_type in entry ${i + 1}`,
        });
        return;
      }

      if (!Object.values(NotificationReferenceType).includes(reference_type)) {
        res.status(400).json({
          success: false,
          message: `Invalid reference_type in entry ${i + 1}`,
        });
        return;
      }
    }

    const createdNotifications = await Notification.create(
      payload.map(
        ({
          user_id,
          notification_type,
          message,
          delivery_method,
          reference_type,
          reference_id,
        }) => ({
          user_id,
          notification_type,
          message,
          delivery_method,
          reference_type,
          reference_id,
        }),
      ),
    );

    // Create audit log for notification sent
    const senderId = req.user?.userId || "system";
    for (const notification of createdNotifications) {
      await createAuditLog(
        senderId,
        AuditAction.NOTIFICATION_SENT,
        "Notification",
        notification.id,
      );
    }

    res.status(201).json({
      success: true,
      data: Array.isArray(req.body)
        ? createdNotifications
        : createdNotifications[0],
      count: createdNotifications.length,
    });
  } catch (error) {
    next(error);
  }
};

export const getNotificationsByUser = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const user_id = req.user?.userId;
    const {
      unread_only,
      notification_type,
      page = "1",
      limit = "20",
    } = req.query;

    if (!user_id) {
      res.status(401).json({
        success: false,
        message: "User not authenticated",
      });
      return;
    }

    const filter: FilterQuery<INotification> = { user_id };
    if (unread_only === "true") {
      filter.read_at = { $exists: false };
    }
    if (notification_type) {
      filter.notification_type = notification_type as NotificationType;
    }

    const pageNum = Math.max(1, Number(page));
    const limitNum = Math.min(100, Math.max(1, Number(limit)));
    const skip = (pageNum - 1) * limitNum;

    const [notifications, total] = await Promise.all([
      Notification.find(filter)
        .sort({ sent_at: -1 })
        .skip(skip)
        .limit(limitNum),
      Notification.countDocuments(filter),
    ]);

    res.status(200).json({
      success: true,
      data: notifications,
      count: notifications.length,
      total,
      page: pageNum,
      totalPages: Math.ceil(total / limitNum),
    });
  } catch (error) {
    next(error);
  }
};

export const getNotificationById = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { id } = req.params;

    const notification = await Notification.findOne({ id }).populate(
      "user_id",
      "name email",
    );

    if (!notification) {
      res.status(404).json({
        success: false,
        message: "Notification not found",
      });
      return;
    }

    res.status(200).json({
      success: true,
      data: notification,
    });
  } catch (error) {
    next(error);
  }
};

export const markAsRead = async (
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

    const notification = await Notification.findOne({ id });
    if (!notification) {
      res.status(404).json({
        success: false,
        message: "Notification not found",
      });
      return;
    }

    if (notification.user_id !== user_id) {
      res.status(403).json({
        success: false,
        message: "You are not authorized to update this notification",
      });
      return;
    }

    if (notification.read_at) {
      res.status(200).json({
        success: true,
        data: notification,
        message: "Notification already marked as read",
      });
      return;
    }

    const updatedNotification = await Notification.findOneAndUpdate(
      { id },
      { read_at: new Date() },
      { new: true },
    );

    res.status(200).json({
      success: true,
      data: updatedNotification,
    });
  } catch (error) {
    next(error);
  }
};

export const markAllAsRead = async (
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

    const result = await Notification.updateMany(
      { user_id, read_at: { $exists: false } },
      { read_at: new Date() },
    );

    res.status(200).json({
      success: true,
      message: `${result.modifiedCount} notifications marked as read`,
      modifiedCount: result.modifiedCount,
    });
  } catch (error) {
    next(error);
  }
};

export const deleteNotification = async (
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

    const notification = await Notification.findOne({ id });
    if (!notification) {
      res.status(404).json({
        success: false,
        message: "Notification not found",
      });
      return;
    }

    if (notification.user_id !== user_id) {
      res.status(403).json({
        success: false,
        message: "You are not authorized to delete this notification",
      });
      return;
    }

    await Notification.findOneAndDelete({ id });

    res.status(200).json({
      success: true,
      message: "Notification deleted successfully",
    });
  } catch (error) {
    next(error);
  }
};

export const getUnreadCount = async (
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

    const count = await Notification.countDocuments({
      user_id,
      read_at: { $exists: false },
    });

    res.status(200).json({
      success: true,
      unreadCount: count,
    });
  } catch (error) {
    next(error);
  }
};
