import { Router } from "express";
import {
  createWallet,
  getWalletByUser,
  getWalletById,
  addFunds,
  withdrawFunds,
  getBalance,
} from "../controllers/walletController";
import { authenticate } from "../middlewares/auth";

const router = Router();

router.use(authenticate);

router.get("/me", getWalletByUser);
router.get("/me/balance", getBalance);
router.get("/:id", getWalletById);
router.post("/", createWallet);
router.post("/add-funds", addFunds);
router.post("/withdraw", withdrawFunds);

export default router;
