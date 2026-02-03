import mongoose, { Schema, Document } from 'mongoose';
import { v4 as uuidv4 } from 'uuid';

export interface ILogisticsProviderProfile extends Document {
  id: string;
  created_at: Date;
  user_id: string;
  company_name: string;
  verified: boolean;
}

const logisticsProviderProfileSchema = new Schema<ILogisticsProviderProfile>(
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
      unique: true,
      ref: 'User'
    },
    company_name: {
      type: String,
      required: true,
      trim: true
    },
    verified: {
      type: Boolean,
      default: false,
      required: true
    }
  },
  {
    timestamps: false,
    versionKey: false
  }
);

logisticsProviderProfileSchema.index({ user_id: 1 });
logisticsProviderProfileSchema.index({ id: 1 });
logisticsProviderProfileSchema.index({ verified: 1 });

const LogisticsProviderProfile = mongoose.model<ILogisticsProviderProfile>('LogisticsProviderProfile', logisticsProviderProfileSchema);

export default LogisticsProviderProfile;
