import mongoose, { Schema, Document } from 'mongoose';
import { v4 as uuidv4 } from 'uuid';

export enum UserRole {
  FARMER = 'Farmer',
  BUYER = 'Buyer',
  COOPERATIVE = 'Cooperative',
  LOGISTICS_PROVIDER = 'Logistics Provider',
  FINANCIAL_PARTNER = 'Financial Partner',
  ADMIN = 'Admin'
}

export interface IUser extends Document {
  id: string;
  created_at: Date;
  name: string;
  mobile_number: string;
  otp_secret: string;
  role: UserRole;
  aadhaar_verified: boolean;
  business_verified: boolean;
  recovery_email?: string;
  telegram_chat_id?: string;
  is_telegram_linked: boolean;
}

const userSchema = new Schema<IUser>(
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
    name: {
      type: String,
      required: [true, 'Name is required'],
      trim: true
    },
    mobile_number: {
      type: String,
      required: [true, 'Mobile number is required'],
      unique: true,
      trim: true,
      match: [/^[6-9]\d{9}$/, 'Please provide a valid Indian mobile number']
    },
    otp_secret: {
      type: String,
      required: true,
      default: () => {
        return Math.floor(100000 + Math.random() * 900000).toString();
      }
    },
    role: {
      type: String,
      enum: Object.values(UserRole),
      required: [true, 'User role is required']
    },
    aadhaar_verified: {
      type: Boolean,
      default: false,
      required: true
    },
    business_verified: {
      type: Boolean,
      default: false,
      required: true
    },
    recovery_email: {
      type: String,
      trim: true,
      lowercase: true,
      match: [
        /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/,
        'Please provide a valid email address'
      ]
    },
    telegram_chat_id: {
      type: String
    },
    is_telegram_linked: {
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

userSchema.index({ role: 1 });

userSchema.post('save', async function(doc) {
  if (this.isNew) {
    const UserConsent = mongoose.model('UserConsent');
    const consentTypes = ['data_sharing', 'finance', 'analytics', 'notifications'];
    
    const consents = consentTypes.map(type => ({
      user_id: doc.id,
      consent_type: type,
      granted_at: new Date()
    }));

    try {
      await UserConsent.insertMany(consents);
    } catch (error) {
      console.error('Error creating user consents:', error);
    }
  }
});

const User = mongoose.model<IUser>('User', userSchema);

export default User;