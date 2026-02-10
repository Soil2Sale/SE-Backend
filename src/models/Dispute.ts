import mongoose, { Schema, Document } from "mongoose";
import { v4 as uuidv4 } from "uuid";

export enum DisputeStatus {
  OPEN = "OPEN",
  UNDER_REVIEW = "UNDER_REVIEW",
  RESOLVED = "RESOLVED",
  REJECTED = "REJECTED",
}

export interface IDispute extends Document {
  id: string;
  created_at: Date;
  order_id: string;
  raised_by_user_id: string;
  description: string;
  status: DisputeStatus;
}

const disputeSchema = new Schema<IDispute>(
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
    order_id: {
      type: String,
      required: true,
      ref: "Order",
    },
    raised_by_user_id: {
      type: String,
      required: true,
      ref: "User",
    },
    description: {
      type: String,
      required: true,
      trim: true,
    },
    status: {
      type: String,
      enum: Object.values(DisputeStatus),
      default: DisputeStatus.OPEN,
      required: true,
    },
  },
  {
    timestamps: false,
    versionKey: false,
  },
);

disputeSchema.index({ order_id: 1 });
disputeSchema.index({ raised_by_user_id: 1 });
disputeSchema.index({ status: 1 });
disputeSchema.index({ created_at: -1 });

const Dispute = mongoose.model<IDispute>("Dispute", disputeSchema);

export default Dispute;
