import { Router } from "express";
import {
  createAdvisory,
  getAdvisories,
  getAdvisoryById,
  updateAdvisory,
  deleteAdvisory,
} from "../controllers/advisoryContentController";
import { authenticate } from "../middlewares/auth";

const router = Router();

router.use(authenticate);

router.get("/", getAdvisories);
router.get("/:id", getAdvisoryById);
router.post("/", createAdvisory);
router.put("/:id", updateAdvisory);
router.delete("/:id", deleteAdvisory);

export default router;
