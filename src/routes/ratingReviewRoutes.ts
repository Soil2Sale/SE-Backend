import { Router } from "express";
import {
  createReview,
  getReviewsForUser,
  getReviewsByUser,
  getReviewById,
  getUserRatingStats,
  updateReview,
  deleteReview,
} from "../controllers/ratingReviewController";
import { authenticate } from "../middlewares/auth";

const router = Router();

router.use(authenticate);

router.get("/for-user/:userId", getReviewsForUser);
router.get("/by-user/:userId", getReviewsByUser);
router.get("/stats/:userId", getUserRatingStats);
router.get("/:id", getReviewById);
router.post("/", createReview);
router.put("/:id", updateReview);
router.delete("/:id", deleteReview);

export default router;
