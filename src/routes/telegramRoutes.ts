import { Router } from "express";
import { linkTelegram, unlinkTelegram, getTelegramStatus } from "../controllers/telegramController";
import { authenticate } from "../middlewares/auth";

const router = Router();

router.post("/link", linkTelegram);
router.delete("/:userId/unlink", authenticate, unlinkTelegram);
router.get("/:userId/status", authenticate, getTelegramStatus);

export default router;
