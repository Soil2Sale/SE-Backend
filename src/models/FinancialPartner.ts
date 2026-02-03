import mongoose, { Schema, Document } from 'mongoose';
import { v4 as uuidv4 } from 'uuid';

export enum FinancialPartnerType {
  BANK = 'BANK',
  MFI = 'MFI',
  NBFC = 'NBFC',
  INSURANCE_PROVIDER = 'INSURANCE_PROVIDER'
}

export interface IFinancialPartner extends Document {
  id: string;
  created_at: Date;
  user_id: string;
  name: string;
  type: FinancialPartnerType;
}

const financialPartnerSchema = new Schema<IFinancialPartner>(
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
    name: {
      type: String,
      required: true,
      trim: true
    },
    type: {
      type: String,
      enum: Object.values(FinancialPartnerType),
      required: true
    }
  },
  {
    timestamps: false,
    versionKey: false
  }
);

financialPartnerSchema.index({ user_id: 1 });
financialPartnerSchema.index({ id: 1 });
financialPartnerSchema.index({ type: 1 });

const FinancialPartner = mongoose.model<IFinancialPartner>('FinancialPartner', financialPartnerSchema);

export default FinancialPartner;
