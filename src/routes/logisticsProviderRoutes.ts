import { Router } from "express";
import {
  createLogisticsProfile,
  getLogisticsProfiles,
  getLogisticsProfileById,
  getLogisticsProfileByUser,
  updateLogisticsProfile,
  verifyLogisticsProvider,
} from "../controllers/logisticsProviderController";
import { authenticate } from "../middlewares/auth";

const router = Router();

router.use(authenticate);

router.get("/", getLogisticsProfiles);
router.get("/me", getLogisticsProfileByUser);
router.get("/:id", getLogisticsProfileById);
router.post("/", createLogisticsProfile);
router.put("/:id", updateLogisticsProfile);
router.patch("/:id/verify", verifyLogisticsProvider);

export default router;
