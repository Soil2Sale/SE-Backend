import mongoose, { Schema, Document } from 'mongoose';
import { v4 as uuidv4 } from 'uuid';

export enum VehicleType {
  AUTO_RICKSHAW = 'AUTO_RICKSHAW',
  PICKUP_VAN = 'PICKUP_VAN',
  MINI_TRUCK = 'MINI_TRUCK',
  TRUCK = 'TRUCK',
  TRACTOR_TROLLEY = 'TRACTOR_TROLLEY'
}

export interface IVehicle extends Document {
  id: string;
  created_at: Date;
  logistics_provider_profile_id: string;
  vehicle_type: VehicleType;
  capacity: number;
  available: boolean;
}

const vehicleSchema = new Schema<IVehicle>(
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
    logistics_provider_profile_id: {
      type: String,
      required: true,
      ref: 'LogisticsProviderProfile'
    },
    vehicle_type: {
      type: String,
      enum: Object.values(VehicleType),
      required: true
    },
    capacity: {
      type: Number,
      required: true,
      min: [0, 'Capacity must be positive']
    },
    available: {
      type: Boolean,
      default: true,
      required: true
    }
  },
  {
    timestamps: false,
    versionKey: false
  }
);

vehicleSchema.index({ logistics_provider_profile_id: 1 });
vehicleSchema.index({ id: 1 });
vehicleSchema.index({ vehicle_type: 1 });
vehicleSchema.index({ available: 1 });
vehicleSchema.index({ logistics_provider_profile_id: 1, available: 1 });

const Vehicle = mongoose.model<IVehicle>('Vehicle', vehicleSchema);

export default Vehicle;
