import { Router } from "express";
import {
  createShipment,
  getShipmentsByOrder,
  getShipmentsByProvider,
  getShipmentById,
  updateShipmentStatus,
  confirmDelivery,
  trackShipment,
} from "../controllers/shipmentController";
import { authenticate } from "../middlewares/auth";

const router = Router();

router.use(authenticate);

router.get("/", getShipmentsByProvider);
router.get("/track/:trackingCode", trackShipment);
router.get("/order/:orderId", getShipmentsByOrder);
router.get("/:id", getShipmentById);
router.post("/", createShipment);
router.patch("/:id/status", updateShipmentStatus);
router.patch("/:id/deliver", confirmDelivery);

export default router;
