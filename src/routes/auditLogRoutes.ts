import { Router } from "express";
import {
  createAuditLog,
  getAuditLogs,
  getAuditLogById,
  getAuditLogsByEntity,
  getAuditLogsByUser,
  getAuditStatsByAction,
} from "../controllers/auditLogController";
import { authenticate } from "../middlewares/auth";

const router = Router();

router.use(authenticate);

router.get("/", getAuditLogs);
router.get("/stats", getAuditStatsByAction);
router.get("/entity/:entityType/:entityId", getAuditLogsByEntity);
router.get("/user/:userId", getAuditLogsByUser);
router.get("/:id", getAuditLogById);
router.post("/", createAuditLog);

export default router;
