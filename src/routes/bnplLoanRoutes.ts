import { Router } from "express";
import {
  createBNPLLoan,
  getBNPLLoansByFarmer,
  getBNPLLoanById,
  updateRepaymentStatus,
  makePayment,
  getLoansDueSoon,
} from "../controllers/bnplLoanController";
import { authenticate } from "../middlewares/auth";

const router = Router();

router.use(authenticate);

router.get("/", getBNPLLoansByFarmer);
router.get("/due-soon", getLoansDueSoon);
router.get("/:id", getBNPLLoanById);
router.post("/", createBNPLLoan);
router.patch("/:id/status", updateRepaymentStatus);
router.post("/:id/payment", makePayment);

export default router;
