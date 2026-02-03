import mongoose, { Schema, Document } from "mongoose";
import { v4 as uuidv4 } from "uuid";

export enum QualityGrade {
  PREMIUM = "PREMIUM",
  STANDARD = "STANDARD",
  ECONOMY = "ECONOMY",
}

export enum CropListingStatus {
  DRAFT = "DRAFT",
  ACTIVE = "ACTIVE",
  UNDER_NEGOTIATION = "UNDER_NEGOTIATION",
  SOLD = "SOLD",
  CANCELLED = "CANCELLED",
}

export interface ICropListing extends Document {
  id: string;
  created_at: Date;
  farmer_profile_id: string;
  crop_name: string;
  quality_grade: QualityGrade;
  quantity: number;
  expected_price: number;
  status: CropListingStatus;
}

const cropListingSchema = new Schema<ICropListing>(
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
    farmer_profile_id: {
      type: String,
      required: true,
      ref: "FarmerProfile",
    },
    crop_name: {
      type: String,
      required: true,
      trim: true,
    },
    quality_grade: {
      type: String,
      enum: Object.values(QualityGrade),
      required: true,
    },
    quantity: {
      type: Number,
      required: true,
      min: [0, "Quantity must be positive"],
    },
    expected_price: {
      type: Number,
      required: true,
      min: [0, "Expected price must be positive"],
    },
    status: {
      type: String,
      enum: Object.values(CropListingStatus),
      default: CropListingStatus.DRAFT,
      required: true,
    },
  },
  {
    timestamps: false,
    versionKey: false,
  },
);

cropListingSchema.index({ farmer_profile_id: 1 });
cropListingSchema.index({ id: 1 });
cropListingSchema.index({ status: 1 });
cropListingSchema.index({ crop_name: 1 });
cropListingSchema.index({ quality_grade: 1 });
cropListingSchema.index({ status: 1, crop_name: 1 });
cropListingSchema.index({ created_at: -1 });

const CropListing = mongoose.model<ICropListing>(
  "CropListing",
  cropListingSchema,
);

export default CropListing;
