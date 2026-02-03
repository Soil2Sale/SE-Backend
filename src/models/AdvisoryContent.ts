import mongoose, { Schema, Document } from "mongoose";
import { v4 as uuidv4 } from "uuid";

export interface IAdvisoryContent extends Document {
  id: string;
  created_at: Date;
  title: string;
  content: string;
  source: string;
  language_code: string;
}

const advisoryContentSchema = new Schema<IAdvisoryContent>(
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
    title: {
      type: String,
      required: true,
      trim: true,
    },
    content: {
      type: String,
      required: true,
      trim: true,
    },
    source: {
      type: String,
      required: true,
      trim: true,
    },
    language_code: {
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

advisoryContentSchema.index({ id: 1 });
advisoryContentSchema.index({ language_code: 1 });
advisoryContentSchema.index({ created_at: -1 });

const AdvisoryContent = mongoose.model<IAdvisoryContent>(
  "AdvisoryContent",
  advisoryContentSchema,
);

export default AdvisoryContent;
