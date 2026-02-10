import { Router } from "express";
import {
  createCreditOffer,
  getCreditOffers,
  getCreditOfferById,
  getCreditOffersByFarmer,
  getCreditOffersByPartner,
  updateCreditOffer,
  deleteCreditOffer,
} from "../controllers/creditOfferController";
import { authenticate } from "../middlewares/auth";

const router = Router();

router.use(authenticate);

router.get("/", getCreditOffers);
router.get("/farmer", getCreditOffersByFarmer);
router.get("/partner", getCreditOffersByPartner);
router.get("/:id", getCreditOfferById);
router.post("/", createCreditOffer);
router.put("/:id", updateCreditOffer);
router.delete("/:id", deleteCreditOffer);

export default router;
