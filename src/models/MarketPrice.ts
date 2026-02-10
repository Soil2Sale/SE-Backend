import mongoose, { Schema, Document } from "mongoose";
import { v4 as uuidv4 } from "uuid";

export enum MarketType {
  BUYER = "BUYER",
  MANDI = "MANDI",
}

export enum PriceType {
  WHOLESALE = "Wholesale",
  RETAIL = "Retail",
}

export interface IMarketPrice extends Document {
  id: string;
  created_at: Date;
  crop_name: string;
  market_location: string;
  price: number;
  recorded_date: Date;
  price_type: PriceType;
  market_type: MarketType;
  state: string;
}

const marketPriceSchema = new Schema<IMarketPrice>(
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
    crop_name: {
      type: String,
      required: true,
      trim: true,
    },
    market_location: {
      type: String,
      required: true,
      trim: true,
    },
    price: {
      type: Number,
      required: true,
      min: [0, "Price must be positive"],
    },
    recorded_date: {
      type: Date,
      required: true,
    },
    price_type: {
      type: String,
      enum: Object.values(PriceType),
      required: true,
    },
    market_type: {
      type: String,
      enum: Object.values(MarketType),
      required: true,
    },
    state: {
      type: String,
      required: true,
      trim: true,
    },
  },
  {
    timestamps: false,
    versionKey: false,
  },
);

marketPriceSchema.index({ crop_name: 1 });
marketPriceSchema.index({ market_location: 1 });
marketPriceSchema.index({ state: 1 });
marketPriceSchema.index({ market_type: 1 });
marketPriceSchema.index({ price_type: 1 });
marketPriceSchema.index({ recorded_date: -1 });
marketPriceSchema.index({ crop_name: 1, state: 1, recorded_date: -1 });

const MarketPrice = mongoose.model<IMarketPrice>(
  "MarketPrice",
  marketPriceSchema,
);

export default MarketPrice;
