import { Router } from "express";
import {
  createScheme,
  getSchemes,
  getSchemeById,
  searchSchemes,
  updateScheme,
  deleteScheme,
} from "../controllers/governmentSchemeController";
import { authenticate } from "../middlewares/auth";

const router = Router();

router.use(authenticate);

router.get("/", getSchemes);
router.get("/search", searchSchemes);
router.get("/:id", getSchemeById);
router.post("/", createScheme);
router.put("/:id", updateScheme);
router.delete("/:id", deleteScheme);

export default router;
