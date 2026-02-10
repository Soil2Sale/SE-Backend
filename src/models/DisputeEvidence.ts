import mongoose, { Schema, Document } from "mongoose";
import { v4 as uuidv4 } from "uuid";

export interface IDisputeEvidence extends Document {
  id: string;
  created_at: Date;
  dispute_id: string;
  user_id: string;
  file_url: string;
  description?: string;
}

const disputeEvidenceSchema = new Schema<IDisputeEvidence>(
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
    dispute_id: {
      type: String,
      required: true,
      ref: "Dispute",
    },
    user_id: {
      type: String,
      required: true,
      ref: "User",
    },
    file_url: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      trim: true,
    },
  },
  {
    timestamps: false,
    versionKey: false,
  },
);

disputeEvidenceSchema.index({ dispute_id: 1 });
disputeEvidenceSchema.index({ user_id: 1 });
disputeEvidenceSchema.index({ created_at: 1 });

const DisputeEvidence = mongoose.model<IDisputeEvidence>(
  "DisputeEvidence",
  disputeEvidenceSchema,
);

export default DisputeEvidence;
