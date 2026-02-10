import { Router } from "express";
import {
  createNegotiation,
  getNegotiationsByOffer,
  getNegotiationsByUser,
} from "../controllers/negotiationController";
import { authenticate } from "../middlewares/auth";

const router = Router();

router.use(authenticate);

router.get("/", getNegotiationsByUser);
router.get("/offer/:offerId", getNegotiationsByOffer);
router.post("/", createNegotiation);

export default router;
