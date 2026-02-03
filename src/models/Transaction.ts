import mongoose, { Schema, Document } from "mongoose";
import { v4 as uuidv4 } from "uuid";

export enum TransactionType {
  CROP_SALE = "CROP_SALE",
  LOGISTICS_FEE = "LOGISTICS_FEE",
  BNPL_DEDUCTION = "BNPL_DEDUCTION",
  REFUND = "REFUND",
  ADJUSTMENT = "ADJUSTMENT",
}

export enum TransactionStatus {
  INITIATED = "INITIATED",
  SUCCESS = "SUCCESS",
  FAILED = "FAILED",
  REFUNDED = "REFUNDED",
}

export enum ReferenceType {
  ORDER = "ORDER",
  SHIPMENT = "SHIPMENT",
  BNPL = "BNPL",
  DISPUTE = "DISPUTE",
}

export interface ITransaction extends Document {
  id: string;
  created_at: Date;
  sender_wallet_id: string;
  receiver_wallet_id: string;
  amount: number;
  type: TransactionType;
  status: TransactionStatus;
  reference_type: ReferenceType;
  reference_id: string;
  payment_method: string;
  initiated_at: Date;
  completed_at?: Date;
  failure_reason?: string;
}

const transactionSchema = new Schema<ITransaction>(
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
    sender_wallet_id: {
      type: String,
      required: true,
      ref: "Wallet",
    },
    receiver_wallet_id: {
      type: String,
      required: true,
      ref: "Wallet",
    },
    amount: {
      type: Number,
      required: true,
      min: [0, "Amount must be positive"],
    },
    type: {
      type: String,
      enum: Object.values(TransactionType),
      required: true,
    },
    status: {
      type: String,
      enum: Object.values(TransactionStatus),
      default: TransactionStatus.INITIATED,
      required: true,
    },
    reference_type: {
      type: String,
      enum: Object.values(ReferenceType),
      required: true,
    },
    reference_id: {
      type: String,
      required: true,
      trim: true,
    },
    payment_method: {
      type: String,
      required: true,
      trim: true,
    },
    initiated_at: {
      type: Date,
      default: Date.now,
      required: true,
    },
    completed_at: {
      type: Date,
    },
    failure_reason: {
      type: String,
      trim: true,
    },
  },
  {
    timestamps: false,
    versionKey: false,
  },
);

transactionSchema.index({ sender_wallet_id: 1 });
transactionSchema.index({ receiver_wallet_id: 1 });
transactionSchema.index({ id: 1 });
transactionSchema.index({ type: 1 });
transactionSchema.index({ status: 1 });
transactionSchema.index({ reference_type: 1, reference_id: 1 });
transactionSchema.index({ created_at: -1 });
transactionSchema.index({ initiated_at: -1 });

const Transaction = mongoose.model<ITransaction>(
  "Transaction",
  transactionSchema,
);

export default Transaction;
