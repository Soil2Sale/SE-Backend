import { Router } from "express";
import {
  createInsight,
  getInsightsByUser,
  getInsightById,
  getInsightsByCategory,
  deleteInsight,
} from "../controllers/aiInsightController";
import { authenticate } from "../middlewares/auth";

const router = Router();

router.use(authenticate);

router.get("/", getInsightsByUser);
router.get("/category/:category", getInsightsByCategory);
router.get("/:id", getInsightById);
router.post("/", createInsight);
router.delete("/:id", deleteInsight);

export default router;
