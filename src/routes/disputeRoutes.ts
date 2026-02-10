import { Router } from "express";
import {
  createDispute,
  getDisputesByUser,
  getDisputesByOrder,
  getDisputeById,
  updateDisputeStatus,
  addDisputeEvidence,
} from "../controllers/disputeController";
import { authenticate } from "../middlewares/auth";

const router = Router();

router.use(authenticate);

router.get("/", getDisputesByUser);
router.get("/order/:orderId", getDisputesByOrder);
router.get("/:id", getDisputeById);
router.post("/", createDispute);
router.patch("/:id/status", updateDisputeStatus);
router.post("/:id/evidence", addDisputeEvidence);

export default router;
