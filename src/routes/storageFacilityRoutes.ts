import { Router } from "express";
import {
  createStorageFacility,
  getStorageFacilitiesByProvider,
  getStorageFacilitiesByUser,
  getStorageFacilityById,
  updateStorageFacility,
  deleteStorageFacility,
} from "../controllers/storageFacilityController";
import { authenticate } from "../middlewares/auth";

const router = Router();

router.use(authenticate);

router.get("/", getStorageFacilitiesByUser);
router.get("/provider/:providerId", getStorageFacilitiesByProvider);
router.get("/:id", getStorageFacilityById);
router.post("/", createStorageFacility);
router.put("/:id", updateStorageFacility);
router.delete("/:id", deleteStorageFacility);

export default router;
