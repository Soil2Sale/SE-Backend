import mongoose, { Schema, Document } from "mongoose";
import { v4 as uuidv4 } from "uuid";

export interface IFarmerCrop extends Document {
  id: string;
  created_at: Date;
  farmer_profile_id: string;
  farmer_user_id: string;
  crop_name: string;
  seasonality: string;
}

const farmerCropSchema = new Schema<IFarmerCrop>(
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
    farmer_user_id: {
      type: String,
      required: true,
      ref: "User",
    },
    crop_name: {
      type: String,
      required: true,
      trim: true,
    },
    seasonality: {
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

farmerCropSchema.index({ farmer_profile_id: 1 });
farmerCropSchema.index({ farmer_user_id: 1 });
farmerCropSchema.index({ crop_name: 1 });
farmerCropSchema.index({ farmer_profile_id: 1, crop_name: 1 });
farmerCropSchema.index({ farmer_user_id: 1, crop_name: 1 });

const FarmerCrop = mongoose.model<IFarmerCrop>("FarmerCrop", farmerCropSchema);

export default FarmerCrop;
