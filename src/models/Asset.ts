import mongoose, { Schema, Document } from 'mongoose';
import { v4 as uuidv4 } from 'uuid';

export interface IAsset extends Document {
  id: string;
  created_at: Date;
  user_id: string;
  asset_type: string;
  file_url: string;
  description?: string;
}

const assetSchema = new Schema<IAsset>(
  {
    id: {
      type: String,
      default: () => uuidv4(),
      unique: true,
      required: true
    },
    created_at: {
      type: Date,
      default: Date.now,
      required: true
    },
    user_id: {
      type: String,
      required: true,
      ref: 'User'
    },
    asset_type: {
      type: String,
      required: true,
      trim: true
    },
    file_url: {
      type: String,
      required: true,
      trim: true
    },
    description: {
      type: String,
      trim: true
    }
  },
  {
    timestamps: false,
    versionKey: false
  }
);

assetSchema.index({ user_id: 1 });
assetSchema.index({ asset_type: 1 });
assetSchema.index({ user_id: 1, asset_type: 1 });

const Asset = mongoose.model<IAsset>('Asset', assetSchema);

export default Asset;
