import mongoose, { Schema, Document } from "mongoose";
import { v4 as uuidv4 } from "uuid";

export interface IFarmerProfile extends Document {
  id: string;
  created_at: Date;
  user_id: string;
  land_size: number;
  location_latitude: number;
  location_longitude: number;
  manual_location_correction: boolean;
}

const farmerProfileSchema = new Schema<IFarmerProfile>(
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
    },
    land_size: {
      type: Number,
      required: true,
      min: [0, "Land size must be positive"],
    },
    location_latitude: {
      type: Number,
      required: true,
      min: [-90, "Latitude must be between -90 and 90"],
      max: [90, "Latitude must be between -90 and 90"],
    },
    location_longitude: {
      type: Number,
      required: true,
      min: [-180, "Longitude must be between -180 and 180"],
      max: [180, "Longitude must be between -180 and 180"],
    },
    manual_location_correction: {
      type: Boolean,
      default: false,
      required: true,
    },
  },
  {
    timestamps: false,
    versionKey: false,
  },
);

farmerProfileSchema.index({ location_latitude: 1, location_longitude: 1 });

const FarmerProfile = mongoose.model<IFarmerProfile>(
  "FarmerProfile",
  farmerProfileSchema,
);

export default FarmerProfile;
