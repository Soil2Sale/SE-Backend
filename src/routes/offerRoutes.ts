import { Router } from "express";
import {
  createOffer,
  getOffersByBuyer,
  getOffersBySeller,
  getOffersByListing,
  getOfferById,
  updateOffer,
  updateOfferStatus,
  withdrawOffer,
} from "../controllers/offerController";
import { authenticate } from "../middlewares/auth";

const router = Router();

router.use(authenticate);

router.get("/", getOffersByBuyer);
router.get("/seller", getOffersBySeller);
router.get("/listing/:listingId", getOffersByListing);
router.get("/:id", getOfferById);
router.post("/", createOffer);
router.put("/:id", updateOffer);
router.patch("/:id/status", updateOfferStatus);
router.patch("/:id/withdraw", withdrawOffer);

export default router;
