import mongoose, { Schema, Document } from 'mongoose';
import { v4 as uuidv4 } from 'uuid';

export enum ConsentType {
  DATA_SHARING = 'data_sharing',
  FINANCE = 'finance',
  ANALYTICS = 'analytics',
  NOTIFICATIONS = 'notifications'
}

export interface IUserConsent extends Document {
  id: string;
  created_at: Date;
  user_id: string;
  consent_type: ConsentType;
  granted_at: Date;
  revoked_at?: Date;
}

const userConsentSchema = new Schema<IUserConsent>(
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
    consent_type: {
      type: String,
      enum: Object.values(ConsentType),
      required: true
    },
    granted_at: {
      type: Date,
      default: Date.now,
      required: true
    },
    revoked_at: {
      type: Date
    }
  },
  {
    timestamps: false,
    versionKey: false
  }
);

userConsentSchema.index({ user_id: 1 });
userConsentSchema.index({ user_id: 1, consent_type: 1 });
userConsentSchema.index({ id: 1 });

const UserConsent = mongoose.model<IUserConsent>('UserConsent', userConsentSchema);

export default UserConsent;