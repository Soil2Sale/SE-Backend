import { Router } from "express";
import {
  createAsset,
  getAssetsByUser,
  getAssetById,
  updateAsset,
  deleteAsset,
} from "../controllers/assetController";
import { authenticate } from "../middlewares/auth";

const router = Router();

router.use(authenticate);

router.get("/", getAssetsByUser);
router.get("/:id", getAssetById);
router.post("/", createAsset);
router.put("/:id", updateAsset);
router.delete("/:id", deleteAsset);

export default router;
