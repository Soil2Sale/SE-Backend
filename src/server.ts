import dotenv from "dotenv";
dotenv.config();

import express, { Application } from "express";
import mongoose from "mongoose";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import cookieParser from "cookie-parser";
import { connectDB } from "./config/database";
import { errorHandler } from "./middlewares/errorHandler";
import userRoutes from "./routes/userRoutes";
import authRoutes from "./routes/authRoutes";
import farmerProfileRoutes from "./routes/farmerProfileRoutes";
import farmerCropRoutes from "./routes/farmerCropRoutes";
import cropListingRoutes from "./routes/cropListingRoutes";
import telegramRoutes from "./routes/telegramRoutes";
import offerRoutes from "./routes/offerRoutes";
import negotiationRoutes from "./routes/negotiationRoutes";
import orderRoutes from "./routes/orderRoutes";
import walletRoutes from "./routes/walletRoutes";
import transactionRoutes from "./routes/transactionRoutes";
import disputeRoutes from "./routes/disputeRoutes";
import logisticsProviderRoutes from "./routes/logisticsProviderRoutes";
import vehicleRoutes from "./routes/vehicleRoutes";
import shipmentRoutes from "./routes/shipmentRoutes";
import storageFacilityRoutes from "./routes/storageFacilityRoutes";
import bnplLoanRoutes from "./routes/bnplLoanRoutes";
import financialPartnerRoutes from "./routes/financialPartnerRoutes";
import creditOfferRoutes from "./routes/creditOfferRoutes";
import advisoryContentRoutes from "./routes/advisoryContentRoutes";
import aiInsightRoutes from "./routes/aiInsightRoutes";
import governmentSchemeRoutes from "./routes/governmentSchemeRoutes";
import marketPriceRoutes from "./routes/marketPriceRoutes";
import yieldHistoryRoutes from "./routes/yieldHistoryRoutes";
import notificationRoutes from "./routes/notificationRoutes";
import ratingReviewRoutes from "./routes/ratingReviewRoutes";
import assetRoutes from "./routes/assetRoutes";
import auditLogRoutes from "./routes/auditLogRoutes";
import "./config/telegram";

const app: Application = express();
const PORT = process.env.PORT || 3000;

app.use(helmet());
app.use(
  cors({
    origin: process.env.CLIENT_URL,
    credentials: true,
  }),
);
app.use(morgan("dev"));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

app.get("/health", (req, res) => {
  res.status(200).json({ status: "OK", timestamp: new Date() });
});

app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/farmer-profiles", farmerProfileRoutes);
app.use("/api/farmer-crops", farmerCropRoutes);
app.use("/api/crop-listings", cropListingRoutes);
app.use("/api/telegram", telegramRoutes);
app.use("/api/offers", offerRoutes);
app.use("/api/negotiations", negotiationRoutes);
app.use("/api/orders", orderRoutes);
app.use("/api/wallets", walletRoutes);
app.use("/api/transactions", transactionRoutes);
app.use("/api/disputes", disputeRoutes);
app.use("/api/logistics-providers", logisticsProviderRoutes);
app.use("/api/vehicles", vehicleRoutes);
app.use("/api/shipments", shipmentRoutes);
app.use("/api/storage-facilities", storageFacilityRoutes);
app.use("/api/bnpl-loans", bnplLoanRoutes);
app.use("/api/financial-partners", financialPartnerRoutes);
app.use("/api/credit-offers", creditOfferRoutes);
app.use("/api/advisory-content", advisoryContentRoutes);
app.use("/api/ai-insights", aiInsightRoutes);
app.use("/api/government-schemes", governmentSchemeRoutes);
app.use("/api/market-prices", marketPriceRoutes);
app.use("/api/yield-history", yieldHistoryRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/ratings-reviews", ratingReviewRoutes);
app.use("/api/assets", assetRoutes);
app.use("/api/audit-logs", auditLogRoutes);

app.use(errorHandler);

try {
  connectDB();
  app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
    console.log(`Environment: ${process.env.NODE_ENV}`);
  });
} catch (error) {
  console.error("Failed to start server:", error);
  process.exit(1);
}
