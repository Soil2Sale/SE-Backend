import mongoose, { Schema, Document } from "mongoose";
import { v4 as uuidv4 } from "uuid";

export interface INegotiationLog extends Document {
  id: string;
  created_at: Date;
  offer_id: string;
  user_id: string;
  proposed_price: number;
  message?: string;
}

const negotiationLogSchema = new Schema<INegotiationLog>(
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
    offer_id: {
      type: String,
      required: true,
      ref: "Offer",
    },
    user_id: {
      type: String,
      required: true,
      ref: "User",
    },
    proposed_price: {
      type: Number,
      required: true,
      min: [0, "Proposed price must be positive"],
    },
    message: {
      type: String,
      trim: true,
    },
  },
  {
    timestamps: false,
    versionKey: false,
  },
);

negotiationLogSchema.index({ offer_id: 1 });
negotiationLogSchema.index({ user_id: 1 });
negotiationLogSchema.index({ id: 1 });
negotiationLogSchema.index({ created_at: 1 });
negotiationLogSchema.index({ offer_id: 1, created_at: 1 });

const NegotiationLog = mongoose.model<INegotiationLog>(
  "NegotiationLog",
  negotiationLogSchema,
);

export default NegotiationLog;
