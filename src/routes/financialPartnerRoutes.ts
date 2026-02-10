import { Router } from "express";
import {
  createFinancialPartner,
  getFinancialPartners,
  getFinancialPartnerById,
  getFinancialPartnerByUser,
  updateFinancialPartner,
} from "../controllers/financialPartnerController";
import { authenticate } from "../middlewares/auth";

const router = Router();

router.use(authenticate);

router.get("/", getFinancialPartners);
router.get("/me", getFinancialPartnerByUser);
router.get("/:id", getFinancialPartnerById);
router.post("/", createFinancialPartner);
router.put("/:id", updateFinancialPartner);

export default router;
