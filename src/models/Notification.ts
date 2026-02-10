import mongoose, { Schema, Document } from "mongoose";
import { v4 as uuidv4 } from "uuid";

export enum NotificationType {
  ORDER_UPDATE = "ORDER_UPDATE",
  PAYMENT_UPDATE = "PAYMENT_UPDATE",
  LOGISTICS_UPDATE = "LOGISTICS_UPDATE",
  DISPUTE_UPDATE = "DISPUTE_UPDATE",
  SCHEME_ALERT = "SCHEME_ALERT",
  AI_INSIGHT = "AI_INSIGHT",
  BNPL_UPDATE = "BNPL_UPDATE",
  SYSTEM_ALERT = "SYSTEM_ALERT",
}

export enum NotificationReferenceType {
  ORDER = "ORDER",
  TRANSACTION = "TRANSACTION",
  SHIPMENT = "SHIPMENT",
  DISPUTE = "DISPUTE",
  SCHEME = "SCHEME",
  AI_INSIGHT = "AI_INSIGHT",
  BNPL = "BNPL",
  SYSTEM = "SYSTEM",
}

export interface INotification extends Document {
  id: string;
  created_at: Date;
  user_id: string;
  notification_type: NotificationType;
  message: string;
  delivery_method: string;
  sent_at: Date;
  read_at?: Date;
  reference_type: NotificationReferenceType;
  reference_id: string;
}

const notificationSchema = new Schema<INotification>(
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
    user_id: {
      type: String,
      required: true,
      ref: "User",
    },
    notification_type: {
      type: String,
      enum: Object.values(NotificationType),
      required: true,
    },
    message: {
      type: String,
      required: true,
      trim: true,
    },
    delivery_method: {
      type: String,
      required: true,
      trim: true,
    },
    sent_at: {
      type: Date,
      default: Date.now,
      required: true,
    },
    read_at: {
      type: Date,
    },
    reference_type: {
      type: String,
      enum: Object.values(NotificationReferenceType),
      required: true,
    },
    reference_id: {
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

notificationSchema.index({ user_id: 1 });
notificationSchema.index({ notification_type: 1 });
notificationSchema.index({ reference_type: 1, reference_id: 1 });
notificationSchema.index({ created_at: -1 });
notificationSchema.index({ user_id: 1, read_at: 1 });

const Notification = mongoose.model<INotification>(
  "Notification",
  notificationSchema,
);

export default Notification;
