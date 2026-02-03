import mongoose, { Schema, Document } from "mongoose";
import { v4 as uuidv4 } from "uuid";

export enum OfferStatus {
  PENDING = "PENDING",
  ACCEPTED = "ACCEPTED",
  REJECTED = "REJECTED",
  WITHDRAWN = "WITHDRAWN",
}

export interface IOffer extends Document {
  id: string;
  created_at: Date;
  crop_listing_id: string;
  buyer_user_id: string;
  offered_price: number;
  status: OfferStatus;
}

const offerSchema = new Schema<IOffer>(
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
    crop_listing_id: {
      type: String,
      required: true,
      ref: "CropListing",
    },
    buyer_user_id: {
      type: String,
      required: true,
      ref: "User",
    },
    offered_price: {
      type: Number,
      required: true,
      min: [0, "Offered price must be positive"],
    },
    status: {
      type: String,
      enum: Object.values(OfferStatus),
      default: OfferStatus.PENDING,
      required: true,
    },
  },
  {
    timestamps: false,
    versionKey: false,
  },
);

offerSchema.index({ crop_listing_id: 1 });
offerSchema.index({ buyer_user_id: 1 });
offerSchema.index({ id: 1 });
offerSchema.index({ status: 1 });
offerSchema.index({ crop_listing_id: 1, status: 1 });
offerSchema.index({ created_at: -1 });

const Offer = mongoose.model<IOffer>("Offer", offerSchema);

export default Offer;
