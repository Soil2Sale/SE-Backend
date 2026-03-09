import mongoose, { Schema, Document } from "mongoose";
import { v4 as uuidv4 } from "uuid";

export enum ShipmentRequestStatus {
  PENDING = "PENDING", // Farmer submitted, waiting for logistics to respond
  COUNTERED_BY_LOGISTICS = "COUNTERED_BY_LOGISTICS", // Logistics countered, waiting for farmer
  COUNTERED_BY_FARMER = "COUNTERED_BY_FARMER", // Farmer re-countered, waiting for logistics
  ACCEPTED = "ACCEPTED", // Logistics accepted, waiting for buyer confirmation
  REJECTED = "REJECTED", // Logistics rejected
  CONFIRMED = "CONFIRMED", // Buyer confirmed, shipment auto-created
  CANCELLED = "CANCELLED",
}

export enum NegotiationRole {
  FARMER = "FARMER",
  LOGISTICS = "LOGISTICS",
}

export enum NegotiationAction {
  PROPOSED = "PROPOSED",
  COUNTERED = "COUNTERED",
  ACCEPTED = "ACCEPTED",
  REJECTED = "REJECTED",
}

export interface IShipmentNegotiationEntry {
  actor_user_id: string;
  role: NegotiationRole;
  action: NegotiationAction;
  proposed_cost: number;
  proposed_duration_days: number;
  message?: string;
  created_at: Date;
}

export interface IShipmentRequest extends Document {
  id: string;
  order_id: string;
  farmer_user_id: string;
  buyer_user_id: string;
  logistics_provider_profile_id?: string;
  logistics_provider_user_id?: string;
  vehicle_id?: string;
  origin_latitude: number;
  origin_longitude: number;
  destination_latitude: number;
  destination_longitude: number;
  proposed_cost: number;
  proposed_duration_days: number;
  current_proposed_cost: number;
  current_proposed_duration_days: number;
  status: ShipmentRequestStatus;
  shipment_id?: string;
  negotiations: IShipmentNegotiationEntry[];
  created_at: Date;
  updated_at: Date;
}

const negotiationEntrySchema = new Schema<IShipmentNegotiationEntry>(
  {
    actor_user_id: { type: String, required: true },
    role: {
      type: String,
      enum: Object.values(NegotiationRole),
      required: true,
    },
    action: {
      type: String,
      enum: Object.values(NegotiationAction),
      required: true,
    },
    proposed_cost: { type: Number, required: true, min: 0 },
    proposed_duration_days: { type: Number, required: true, min: 1 },
    message: { type: String, trim: true },
    created_at: { type: Date, default: Date.now },
  },
  { _id: false, versionKey: false },
);

const shipmentRequestSchema = new Schema<IShipmentRequest>(
  {
    id: {
      type: String,
      default: () => uuidv4(),
      unique: true,
      required: true,
    },
    order_id: { type: String, required: true, ref: "Order" },
    farmer_user_id: { type: String, required: true, ref: "User" },
    buyer_user_id: { type: String, required: true, ref: "User" },
    logistics_provider_profile_id: {
      type: String,
      ref: "LogisticsProviderProfile",
    },
    logistics_provider_user_id: { type: String, ref: "User" },
    vehicle_id: { type: String, ref: "Vehicle" },
    origin_latitude: {
      type: Number,
      required: true,
      min: [-90, "Latitude must be between -90 and 90"],
      max: [90, "Latitude must be between -90 and 90"],
    },
    origin_longitude: {
      type: Number,
      required: true,
      min: [-180, "Longitude must be between -180 and 180"],
      max: [180, "Longitude must be between -180 and 180"],
    },
    destination_latitude: {
      type: Number,
      required: true,
      min: [-90, "Latitude must be between -90 and 90"],
      max: [90, "Latitude must be between -90 and 90"],
    },
    destination_longitude: {
      type: Number,
      required: true,
      min: [-180, "Longitude must be between -180 and 180"],
      max: [180, "Longitude must be between -180 and 180"],
    },
    proposed_cost: {
      type: Number,
      required: true,
      min: [0, "Proposed cost must be positive"],
    },
    proposed_duration_days: {
      type: Number,
      required: true,
      min: [1, "Duration must be at least 1 day"],
    },
    current_proposed_cost: {
      type: Number,
      required: true,
      min: [0, "Cost must be positive"],
    },
    current_proposed_duration_days: {
      type: Number,
      required: true,
      min: [1, "Duration must be at least 1 day"],
    },
    status: {
      type: String,
      enum: Object.values(ShipmentRequestStatus),
      default: ShipmentRequestStatus.PENDING,
      required: true,
    },
    shipment_id: { type: String, ref: "Shipment" },
    negotiations: { type: [negotiationEntrySchema], default: [] },
  },
  {
    timestamps: { createdAt: "created_at", updatedAt: "updated_at" },
    versionKey: false,
  },
);

shipmentRequestSchema.index({ order_id: 1 });
shipmentRequestSchema.index({ farmer_user_id: 1 });
shipmentRequestSchema.index({ buyer_user_id: 1 });
shipmentRequestSchema.index({ logistics_provider_user_id: 1 });
shipmentRequestSchema.index({ logistics_provider_profile_id: 1 });
shipmentRequestSchema.index({ status: 1 });
shipmentRequestSchema.index({ created_at: -1 });

const ShipmentRequest = mongoose.model<IShipmentRequest>(
  "ShipmentRequest",
  shipmentRequestSchema,
);

export default ShipmentRequest;
