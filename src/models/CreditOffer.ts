import mongoose, { Schema, Document } from 'mongoose';
import { v4 as uuidv4 } from 'uuid';

export enum LoanType {
  KCC = 'KCC',
  BNPL = 'BNPL',
  REQUIREMENT_LOAN = 'REQUIREMENT_LOAN',
  EQUIPMENT_LOAN = 'EQUIPMENT_LOAN',
  EMERGENCY_LOAN = 'EMERGENCY_LOAN',
  INSURANCE_PREMIUM = 'INSURANCE_PREMIUM'
}

export interface ICreditOffer extends Document {
  id: string;
  created_at: Date;
  financial_partner_id: string;
  farmer_user_id: string;
  loan_type: LoanType;
  interest_rate: number;
  max_amount: number;
}

const creditOfferSchema = new Schema<ICreditOffer>(
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
    financial_partner_id: {
      type: String,
      required: true,
      ref: 'FinancialPartner'
    },
    farmer_user_id: {
      type: String,
      required: true,
      ref: 'User'
    },
    loan_type: {
      type: String,
      enum: Object.values(LoanType),
      required: true
    },
    interest_rate: {
      type: Number,
      required: true,
      min: [0, 'Interest rate must be non-negative']
    },
    max_amount: {
      type: Number,
      required: true,
      min: [0, 'Max amount must be positive']
    }
  },
  {
    timestamps: false,
    versionKey: false
  }
);

creditOfferSchema.index({ financial_partner_id: 1 });
creditOfferSchema.index({ farmer_user_id: 1 });
creditOfferSchema.index({ id: 1 });
creditOfferSchema.index({ loan_type: 1 });
creditOfferSchema.index({ farmer_user_id: 1, loan_type: 1 });

const CreditOffer = mongoose.model<ICreditOffer>('CreditOffer', creditOfferSchema);

export default CreditOffer;
