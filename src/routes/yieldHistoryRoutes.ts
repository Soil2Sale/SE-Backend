import { Router } from "express";
import {
  createYieldRecord,
  getYieldsByFarmer,
  getYieldsByCrop,
  getYieldById,
  updateYieldRecord,
  deleteYieldRecord,
  getYieldAnalytics,
} from "../controllers/yieldHistoryController";
import { authenticate } from "../middlewares/auth";

const router = Router();

router.use(authenticate);

router.get("/", getYieldsByFarmer);
router.get("/analytics", getYieldAnalytics);
router.get("/crop/:cropId", getYieldsByCrop);
router.get("/:id", getYieldById);
router.post("/", createYieldRecord);
router.put("/:id", updateYieldRecord);
router.delete("/:id", deleteYieldRecord);

export default router;
