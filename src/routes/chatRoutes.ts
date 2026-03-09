import { Router } from "express";
import { authenticate } from "../middlewares/auth";
import {
  getConversations,
  getMessages,
  markRead,
} from "../controllers/chatController";

const router = Router();

router.use(authenticate);

router.get("/conversations", getConversations);
router.get("/messages/:otherUserId", getMessages);
router.patch("/messages/:otherUserId/read", markRead);

export default router;
