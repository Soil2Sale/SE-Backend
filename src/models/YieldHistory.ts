import mongoose, { Schema, Document } from "mongoose";
import { v4 as uuidv4 } from "uuid";

export interface IYieldHistory extends Document {
  id: string;
  created_at: Date;
  farmer_crop_id: string;
  farmer_user_id: string;
  year: number;
  yield_quantity: number;
  consent_sharing: boolean;
}

const yieldHistorySchema = new Schema<IYieldHistory>(
  {
    id: {
      type: String,
      default: () => uuidv4(),
      unique: true,
      required: true,
    },
    created_at: {
      type: Date,
      default: Date.now,
      required: true,
    },
    farmer_crop_id: {
      type: String,
      required: true,
      ref: "FarmerCrop",
    },
    farmer_user_id: {
      type: String,
      required: true,
      ref: "User",
    },
    year: {
      type: Number,
      required: true,
      min: [1900, "Year must be valid"],
      max: [new Date().getFullYear(), "Year cannot be in the future"],
    },
    yield_quantity: {
      type: Number,
      required: true,
      min: [0, "Yield quantity must be positive"],
    },
    consent_sharing: {
      type: Boolean,
      default: false,
      required: true,
    },
  },
  {
    timestamps: false,
    versionKey: false,
  },
);

yieldHistorySchema.index({ farmer_crop_id: 1 });
yieldHistorySchema.index({ farmer_user_id: 1 });
yieldHistorySchema.index({ year: -1 });
yieldHistorySchema.index({ farmer_crop_id: 1, year: -1 });
yieldHistorySchema.index({ farmer_user_id: 1, year: -1 });

const YieldHistory = mongoose.model<IYieldHistory>(
  "YieldHistory",
  yieldHistorySchema,
);

export default YieldHistory;
