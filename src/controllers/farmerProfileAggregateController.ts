import { Request, Response, NextFunction } from "express";
import User from "../models/User";
import FarmerProfile from "../models/FarmerProfile";
import FarmerCrop from "../models/FarmerCrop";
import YieldHistory from "../models/YieldHistory";
import Wallet from "../models/Wallet";
import BNPLLoan from "../models/BNPLLoan";
import RatingReview from "../models/RatingReview";
import Asset from "../models/Asset";
import Transaction, {
  TransactionType,
  TransactionStatus,
} from "../models/Transaction";

export const getFarmerFullProfile = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { userId } = req.params;
    const user = await User.findOne({ id: userId });
    if (!user) return res.status(404).json({ error: "User not found" });
    const farmerProfile = await FarmerProfile.findOne({ user_id: userId });
    // if (!farmerProfile)
    //   return res.status(404).json({ error: "Farmer profile not found" });
    const crops = await FarmerCrop.find({ farmer_user_id: userId });
    const yield_history = await YieldHistory.find({ farmer_user_id: userId });
    const wallet = await Wallet.findOne({ user_id: userId });
    const bnpl_loans = await BNPLLoan.find({ farmer_user_id: userId });
    const assets = await Asset.find({ user_id: userId });
    const ratingsArr = await RatingReview.find({ reviewed_user_id: userId });
    const recent_reviews = ratingsArr.slice(-2).map((r) => ({
      id: r.id,
      rating: r.rating,
      comment: r.review_text,
      reviewer_name: r.reviewer_user_id,
      created_at: r.created_at,
    }));
    const average_rating = ratingsArr.length
      ? ratingsArr.reduce((sum, r) => sum + r.rating, 0) / ratingsArr.length
      : 0;
    const total_reviews = ratingsArr.length;
    const transactions = await Transaction.find({ sender_user_id: userId });
    let total_sales = 0,
      total_deductions = 0,
      net_earnings = 0,
      successful_transactions = 0;
    transactions.forEach((t) => {
      if (t.type === TransactionType.CROP_SALE) total_sales += t.amount;
      if (
        [
          TransactionType.BNPL_DEDUCTION,
          TransactionType.LOGISTICS_FEE,
          TransactionType.ADJUSTMENT,
        ].includes(t.type)
      )
        total_deductions += t.amount;
      if (t.status === TransactionStatus.SUCCESS) successful_transactions++;
    });
    net_earnings = total_sales - total_deductions;
    res.json({
        personal_info: {
          id: user.id,
          name: user.name,
          mobile_number: user.mobile_number,
          role: user.role,
          aadhaar_verified: user.aadhaar_verified,
          business_verified: user.business_verified,
          telegram_chat_id: user.telegram_chat_id,
          is_telegram_linked: user.is_telegram_linked,
          created_at: user.created_at,
        },
        farm_details: farmerProfile ? {
          id: farmerProfile.id,
          land_size: farmerProfile.land_size,
          location_latitude: farmerProfile.location_latitude,
          location_longitude: farmerProfile.location_longitude,
          manual_location_correction: farmerProfile.manual_location_correction,
        } : null,
        crops: crops.map((c) => ({
          id: c.id,
          crop_name: c.crop_name,
          seasonality: c.seasonality,
        })),
        yield_history: yield_history.map((y) => ({
          id: y.id,
          crop_name:
            crops.find((c) => c.id === y.farmer_crop_id)?.crop_name || "",
          year: y.year,
          yield_quantity: y.yield_quantity,
          consent_sharing: y.consent_sharing,
        })),
        wallet: wallet
          ? {
              id: wallet.id,
              balance: wallet.balance,
              total_credits: 0,
              total_debits: 0,
            }
          : null,
        bnpl_loans: bnpl_loans.map((b) => ({
          id: b.id,
          amount: b.amount,
          status: b.repayment_status,
          due_date: b.due_date,
        })),
        ratings: {
          average_rating,
          total_reviews,
          recent_reviews,
        },
        assets: assets.map((a) => ({
          id: a.id,
          created_at: a.created_at,
          user_id: a.user_id,
          asset_type: a.asset_type,
          file_url: a.file_url,
          description: a.description,
        })),
        transaction_summary: {
          total_sales,
          total_deductions,
          net_earnings,
          successful_transactions,
        },
      });
  } catch (error) {
    next(error);
  }
};
