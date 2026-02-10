import mongoose, { Schema, Document } from "mongoose";
import { v4 as uuidv4 } from "uuid";

export interface IGovernmentScheme extends Document {
  id: string;
  created_at: Date;
  name: string;
  description: string;
  state: string;
  crop: string;
  land_size_min: number;
  land_size_max: number;
  deadline: Date;
}

const governmentSchemeSchema = new Schema<IGovernmentScheme>(
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
    name: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      required: true,
      trim: true,
    },
    state: {
      type: String,
      required: true,
      trim: true,
    },
    crop: {
      type: String,
      required: true,
      trim: true,
    },
    land_size_min: {
      type: Number,
      required: true,
      min: [0, "Land size minimum must be non-negative"],
    },
    land_size_max: {
      type: Number,
      required: true,
      min: [0, "Land size maximum must be positive"],
    },
    deadline: {
      type: Date,
      required: true,
    },
  },
  {
    timestamps: false,
    versionKey: false,
  },
);

governmentSchemeSchema.index({ state: 1 });
governmentSchemeSchema.index({ crop: 1 });
governmentSchemeSchema.index({ deadline: 1 });
governmentSchemeSchema.index({ state: 1, crop: 1 });

const GovernmentScheme = mongoose.model<IGovernmentScheme>(
  "GovernmentScheme",
  governmentSchemeSchema,
);

export default GovernmentScheme;
