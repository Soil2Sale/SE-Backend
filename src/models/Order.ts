import mongoose, { Schema, Document } from "mongoose";
import { v4 as uuidv4 } from "uuid";

export enum OrderStatus {
  CREATED = "CREATED",
  CONFIRMED = "CONFIRMED",
  CANCELLED = "CANCELLED",
  COMPLETED = "COMPLETED",
}

export interface IOrder extends Document {
  id: string;
  created_at: Date;
  crop_listing_id: string;
  buyer_user_id: string;
  final_price: number;
  quantity: number;
  status: OrderStatus;
  payment_status: string;
  sender_user_id: string;
}

const orderSchema = new Schema<IOrder>(
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
    crop_listing_id: {
      type: String,
      required: true,
      ref: "CropListing",
    },
    buyer_user_id: {
      type: String,
      required: true,
      ref: "User",
    },
    final_price: {
      type: Number,
      required: true,
      min: [0, "Final price must be positive"],
    },
    quantity: {
      type: Number,
      required: true,
      min: [0, "Quantity must be positive"],
    },
    status: {
      type: String,
      enum: Object.values(OrderStatus),
      default: OrderStatus.CREATED,
      required: true,
    },
    payment_status: {
      type: String,
      required: true,
      trim: true,
    },
    sender_user_id: {
      type: String,
      required: true,
      ref: "User",
    },
  },
  {
    timestamps: false,
    versionKey: false,
  },
);

orderSchema.index({ crop_listing_id: 1 });
orderSchema.index({ buyer_user_id: 1 });
orderSchema.index({ sender_user_id: 1 });
orderSchema.index({ id: 1 });
orderSchema.index({ status: 1 });
orderSchema.index({ payment_status: 1 });
orderSchema.index({ created_at: -1 });

const Order = mongoose.model<IOrder>("Order", orderSchema);

export default Order;
