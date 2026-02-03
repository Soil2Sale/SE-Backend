import mongoose, { Schema, Document } from "mongoose";
import { v4 as uuidv4 } from "uuid";

export enum ShipmentStatus {
  CREATED = "CREATED",
  DISPATCHED = "DISPATCHED",
  IN_TRANSIT = "IN_TRANSIT",
  DELIVERED = "DELIVERED",
  CANCELLED = "CANCELLED",
}

export interface IShipment extends Document {
  id: string;
  created_at: Date;
  order_id: string;
  logistics_provider_profile_id: string;
  vehicle_id: string;
  origin_latitude: number;
  origin_longitude: number;
  destination_latitude: number;
  destination_longitude: number;
  estimated_cost: number;
  status: ShipmentStatus;
  tracking_code: string;
  delivery_confirmed_at?: Date;
}

const shipmentSchema = new Schema<IShipment>(
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
    order_id: {
      type: String,
      required: true,
      ref: "Order",
    },
    logistics_provider_profile_id: {
      type: String,
      required: true,
      ref: "LogisticsProviderProfile",
    },
    vehicle_id: {
      type: String,
      required: true,
      ref: "Vehicle",
    },
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
    estimated_cost: {
      type: Number,
      required: true,
      min: [0, "Estimated cost must be positive"],
    },
    status: {
      type: String,
      enum: Object.values(ShipmentStatus),
      default: ShipmentStatus.CREATED,
      required: true,
    },
    tracking_code: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    delivery_confirmed_at: {
      type: Date,
    },
  },
  {
    timestamps: false,
    versionKey: false,
  },
);

shipmentSchema.index({ order_id: 1 });
shipmentSchema.index({ logistics_provider_profile_id: 1 });
shipmentSchema.index({ vehicle_id: 1 });
shipmentSchema.index({ id: 1 });
shipmentSchema.index({ status: 1 });
shipmentSchema.index({ tracking_code: 1 });
shipmentSchema.index({ created_at: -1 });

const Shipment = mongoose.model<IShipment>("Shipment", shipmentSchema);

export default Shipment;
