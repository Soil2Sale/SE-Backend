import { Router } from "express";
import {
  getAllFarmerProfiles,
  getFarmerProfileById,
  getFarmerProfileByUserId,
  createFarmerProfile,
  updateFarmerProfile,
  deleteFarmerProfile,
} from "../controllers/farmerProfileController";
import { authenticate } from "../middlewares/auth";

const router = Router();

router.use(authenticate);

router.get("/", getAllFarmerProfiles);
router.get("/user/:userId", getFarmerProfileByUserId);
router.get("/:id", getFarmerProfileById);
router.post("/", createFarmerProfile);
router.put("/:id", updateFarmerProfile);
router.delete("/:id", deleteFarmerProfile);

export default router;
