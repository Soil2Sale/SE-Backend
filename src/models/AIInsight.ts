import mongoose, { Schema, Document } from "mongoose";
import { v4 as uuidv4 } from "uuid";

export enum InsightType {
  PRICE_PREDICTION = "PRICE_PREDICTION",
  DEMAND_FORECAST = "DEMAND_FORECAST",
  MARKET_RECOMMENDATION = "MARKET_RECOMMENDATION",
  PRICE_ALERT = "PRICE_ALERT",
  NEGOTIATION_GUIDANCE = "NEGOTIATION_GUIDANCE",
}

export interface IAIInsight extends Document {
  id: string;
  created_at: Date;
  user_id: string;
  insight_type: InsightType;
  content: string;
  language_code: string;
  crop_name: string;
  region: string;
  confidence_score: number;
  validity_window_start: Date;
  validity_window_end: Date;
}

const aiInsightSchema = new Schema<IAIInsight>(
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
      ref: "User",
    },
    insight_type: {
      type: String,
      enum: Object.values(InsightType),
      required: true,
    },
    content: {
      type: String,
      required: true,
      trim: true,
    },
    language_code: {
      type: String,
      required: true,
      trim: true,
    },
    crop_name: {
      type: String,
      required: true,
      trim: true,
    },
    region: {
      type: String,
      required: true,
      trim: true,
    },
    confidence_score: {
      type: Number,
      required: true,
      min: [0, "Confidence score must be between 0 and 1"],
      max: [1, "Confidence score must be between 0 and 1"],
    },
    validity_window_start: {
      type: Date,
      required: true,
    },
    validity_window_end: {
      type: Date,
      required: true,
    },
  },
  {
    timestamps: false,
    versionKey: false,
  },
);

aiInsightSchema.index({ user_id: 1 });
aiInsightSchema.index({ insight_type: 1 });
aiInsightSchema.index({ crop_name: 1 });
aiInsightSchema.index({ region: 1 });
aiInsightSchema.index({ id: 1 });
aiInsightSchema.index({ created_at: -1 });
aiInsightSchema.index({ validity_window_end: 1 });
aiInsightSchema.index({ user_id: 1, insight_type: 1 });

const AIInsight = mongoose.model<IAIInsight>("AIInsight", aiInsightSchema);

export default AIInsight;
