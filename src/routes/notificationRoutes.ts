import { Router } from "express";
import {
  createNotification,
  getNotificationsByUser,
  getNotificationById,
  markAsRead,
  markAllAsRead,
  deleteNotification,
  getUnreadCount,
} from "../controllers/notificationController";
import { authenticate } from "../middlewares/auth";

const router = Router();

router.use(authenticate);

router.get("/", getNotificationsByUser);
router.get("/unread-count", getUnreadCount);
router.get("/:id", getNotificationById);
router.post("/", createNotification);
router.patch("/:id/read", markAsRead);
router.patch("/read-all", markAllAsRead);
router.delete("/:id", deleteNotification);

export default router;
