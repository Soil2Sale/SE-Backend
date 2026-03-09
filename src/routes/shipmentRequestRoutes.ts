import { Router } from "express";
import {
  createShipmentRequest,
  getShipmentRequests,
  getShipmentRequestById,
  respondToShipmentRequest,
  counterShipmentRequest,
  getShipmentRequestNegotiations,
  buyerConfirmShipmentRequest,
  buyerRejectShipmentRequest,
} from "../controllers/shipmentRequestController";
import { authenticate } from "../middlewares/auth";

const router = Router();

router.use(authenticate);

router.get("/", getShipmentRequests);
router.post("/", createShipmentRequest);
router.get("/:id", getShipmentRequestById);
router.get("/:id/negotiations", getShipmentRequestNegotiations);
router.patch("/:id/respond", respondToShipmentRequest);
router.patch("/:id/counter", counterShipmentRequest);
router.patch("/:id/buyer-confirm", buyerConfirmShipmentRequest);
router.patch("/:id/buyer-reject", buyerRejectShipmentRequest);

export default router;
