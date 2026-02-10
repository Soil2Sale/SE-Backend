import { Router } from "express";
import {
  createTransaction,
  getTransactionById,
  getTransactionsByUser,
  getTransactionsByWallet,
  getTransactionsByOrder,
  processRefund,
} from "../controllers/transactionController";
import { authenticate } from "../middlewares/auth";

const router = Router();

router.use(authenticate);

router.get("/", getTransactionsByUser);
router.get("/wallet/:walletId", getTransactionsByWallet);
router.get("/order/:orderId", getTransactionsByOrder);
router.get("/:id", getTransactionById);
router.post("/", createTransaction);
router.post("/:id/refund", processRefund);

export default router;
