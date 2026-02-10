import { Router } from "express";
import {
  createMarketPrice,
  getMarketPrices,
  getMarketPriceById,
  getLatestPrices,
  getPriceTrends,
  updateMarketPrice,
  deleteMarketPrice,
} from "../controllers/marketPriceController";
import { authenticate } from "../middlewares/auth";

const router = Router();

router.use(authenticate);

router.get("/", getMarketPrices);
router.get("/latest", getLatestPrices);
router.get("/trends", getPriceTrends);
router.get("/:id", getMarketPriceById);
router.post("/", createMarketPrice);
router.put("/:id", updateMarketPrice);
router.delete("/:id", deleteMarketPrice);

export default router;
