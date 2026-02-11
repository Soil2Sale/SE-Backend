import mongoose, { Schema, Document } from "mongoose";
import { v4 as uuidv4 } from "uuid";

export interface IStorageFacility extends Document {
  id: string;
  created_at: Date;
  logistics_provider_profile_id?: string;
  logistics_provider_user_id?: string;
  name: string;
  location_latitude: number;
  location_longitude: number;
  capacity: number;
  availability: boolean;
  pricing_per_unit: number;
}

const storageFacilitySchema = new Schema<IStorageFacility>(
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
    logistics_provider_profile_id: {
      type: String,
      ref: "LogisticsProviderProfile",
    },
    logistics_provider_user_id: {
      type: String,
      ref: "User",
    },
    name: {
      type: String,
      required: true,
      trim: true,
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
    capacity: {
      type: Number,
      required: true,
      min: [0, "Capacity must be positive"],
    },
    availability: {
      type: Boolean,
      default: true,
      required: true,
    },
    pricing_per_unit: {
      type: Number,
      required: true,
      min: [0, "Pricing per unit must be positive"],
    },
  },
  {
    timestamps: false,
    versionKey: false,
  },
);

storageFacilitySchema.index({ logistics_provider_profile_id: 1 });
storageFacilitySchema.index({ logistics_provider_user_id: 1 });
storageFacilitySchema.index({ availability: 1 });
storageFacilitySchema.index({ location_latitude: 1, location_longitude: 1 });

const StorageFacility = mongoose.model<IStorageFacility>(
  "StorageFacility",
  storageFacilitySchema,
);

export default StorageFacility;
