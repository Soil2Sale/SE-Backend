import mongoose, { Schema, Document } from "mongoose";
import { v4 as uuidv4 } from "uuid";

export interface IWallet extends Document {
  id: string;
  created_at: Date;
  user_id: string;
  balance: number;
  currency: string;
}

const walletSchema = new Schema<IWallet>(
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
    user_id: {
      type: String,
      required: true,
      unique: true,
      ref: "User",
    },
    balance: {
      type: Number,
      required: true,
      default: 0,
      min: [0, "Balance cannot be negative"],
    },
    currency: {
      type: String,
      required: true,
      default: "INR",
      trim: true,
      uppercase: true,
    },
  },
  {
    timestamps: false,
    versionKey: false,
  },
);

walletSchema.index({ user_id: 1 });
walletSchema.index({ id: 1 });

const Wallet = mongoose.model<IWallet>("Wallet", walletSchema);

export default Wallet;
