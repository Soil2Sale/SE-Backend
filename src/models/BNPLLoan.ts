import mongoose, { Schema, Document } from "mongoose";
import { v4 as uuidv4 } from "uuid";

export interface IBNPLLoan extends Document {
  id: string;
  created_at: Date;
  farmer_user_id: string;
  amount: number;
  repayment_status: string;
  due_date: Date;
}

const bnplLoanSchema = new Schema<IBNPLLoan>(
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
    farmer_user_id: {
      type: String,
      required: true,
      ref: "User",
    },
    amount: {
      type: Number,
      required: true,
      min: [0, "Amount must be positive"],
    },
    repayment_status: {
      type: String,
      required: true,
      trim: true,
    },
    due_date: {
      type: Date,
      required: true,
    },
  },
  {
    timestamps: false,
    versionKey: false,
  },
);

bnplLoanSchema.index({ farmer_user_id: 1 });
bnplLoanSchema.index({ id: 1 });
bnplLoanSchema.index({ repayment_status: 1 });
bnplLoanSchema.index({ due_date: 1 });
bnplLoanSchema.index({ farmer_user_id: 1, repayment_status: 1 });

const BNPLLoan = mongoose.model<IBNPLLoan>("BNPLLoan", bnplLoanSchema);

export default BNPLLoan;
