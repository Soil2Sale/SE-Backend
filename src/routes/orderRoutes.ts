import { Router } from "express";
import {
  createOrder,
  getOrdersByBuyer,
  getOrdersBySeller,
  getOrderById,
  updateOrderStatus,
  cancelOrder,
} from "../controllers/orderController";
import { authenticate } from "../middlewares/auth";

const router = Router();

router.use(authenticate);

router.get("/purchases", getOrdersByBuyer);
router.get("/sales", getOrdersBySeller);
router.get("/:id", getOrderById);
router.post("/", createOrder);
router.patch("/:id/status", updateOrderStatus);
router.put("/:id/cancel", cancelOrder);

export default router;
