import { Request, Response, NextFunction } from "express";
import Vehicle, { IVehicle, VehicleType } from "../models/Vehicle";
import LogisticsProviderProfile from "../models/LogisticsProviderProfile";
import Shipment from "../models/Shipment";
import { FilterQuery } from "mongoose";

export const createVehicle = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { vehicle_type, capacity, logistics_provider_profile_id } = req.body;
    const user_id = req.user?.userId;
    const user = req.user as any;

    if (!user_id) {
      res.status(401).json({
        success: false,
        message: "User not authenticated",
      });
      return;
    }

    if (!vehicle_type || !capacity) {
      res.status(400).json({
        success: false,
        message: "Vehicle type and capacity are required",
      });
      return;
    }

    let profile_id: string;
    let provider_user_id: string;

    // Admin can override and create vehicles for any logistics provider
    if (user?.role === "Admin" && logistics_provider_profile_id) {
      const profile = await LogisticsProviderProfile.findOne({
        id: logistics_provider_profile_id,
      });
      if (!profile) {
        res.status(404).json({
          success: false,
          message: "Logistics provider profile not found",
        });
        return;
      }
      profile_id = profile.id;
      provider_user_id = profile.user_id;
    } else {
      // Regular logistics provider creates vehicle for their own profile
      const profile = await LogisticsProviderProfile.findOne({ user_id });
      if (!profile) {
        res.status(404).json({
          success: false,
          message: "Logistics provider profile not found for this user",
        });
        return;
      }
      profile_id = profile.id;
      provider_user_id = user_id;
    }

    const vehicle = await Vehicle.create({
      logistics_provider_profile_id: profile_id,
      logistics_provider_user_id: provider_user_id,
      vehicle_type,
      capacity,
      available: true,
    });

    res.status(201).json({
      success: true,
      data: vehicle,
    });
  } catch (error) {
    next(error);
  }
};

export const getVehiclesByProvider = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { providerId } = req.params;
    const { available } = req.query;

    const filter: FilterQuery<IVehicle> = {
      logistics_provider_profile_id: providerId,
    };
    if (available !== undefined) {
      filter.available = available === "true";
    }

    const vehicles = await Vehicle.find(filter)
      .populate("logistics_provider_profile_id", "company_name verified")
      .sort({ created_at: -1 });

    res.status(200).json({
      success: true,
      data: vehicles,
      count: vehicles.length,
    });
  } catch (error) {
    next(error);
  }
};

export const getVehiclesByUser = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const user_id = req.user?.userId;
    const { available } = req.query;

    if (!user_id) {
      res.status(401).json({
        success: false,
        message: "User not authenticated",
      });
      return;
    }

    const filter: FilterQuery<IVehicle> = {
      logistics_provider_user_id: user_id,
    };
    if (available !== undefined) {
      filter.available = available === "true";
    }

    const vehicles = await Vehicle.find(filter).sort({ created_at: -1 });

    res.status(200).json({
      success: true,
      data: vehicles,
      count: vehicles.length,
    });
  } catch (error) {
    next(error);
  }
};

export const getVehicleById = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { id } = req.params;

    const vehicle = await Vehicle.findOne({ id }).populate(
      "logistics_provider_profile_id",
      "company_name verified",
    );

    if (!vehicle) {
      res.status(404).json({
        success: false,
        message: "Vehicle not found",
      });
      return;
    }

    res.status(200).json({
      success: true,
      data: vehicle,
    });
  } catch (error) {
    next(error);
  }
};

export const updateVehicle = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { id } = req.params;
    const { vehicle_type, capacity, available } = req.body;
    const user_id = req.user?.userId;

    if (!user_id) {
      res.status(401).json({
        success: false,
        message: "User not authenticated",
      });
      return;
    }

    const profile = await LogisticsProviderProfile.findOne({ user_id });
    if (!profile) {
      res.status(404).json({
        success: false,
        message: "Logistics provider profile not found",
      });
      return;
    }

    const vehicle = await Vehicle.findOne({ id });
    if (!vehicle) {
      res.status(404).json({
        success: false,
        message: "Vehicle not found",
      });
      return;
    }

    if (vehicle.logistics_provider_profile_id !== profile.id) {
      res.status(403).json({
        success: false,
        message: "You are not authorized to update this vehicle",
      });
      return;
    }

    const updateData: Partial<IVehicle> = {};
    if (vehicle_type) updateData.vehicle_type = vehicle_type;
    if (capacity !== undefined) updateData.capacity = capacity;
    if (available !== undefined) updateData.available = available;

    const updatedVehicle = await Vehicle.findOneAndUpdate({ id }, updateData, {
      new: true,
      runValidators: true,
    });

    res.status(200).json({
      success: true,
      data: updatedVehicle,
    });
  } catch (error) {
    next(error);
  }
};

export const deleteVehicle = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { id } = req.params;
    const user_id = req.user?.userId;

    if (!user_id) {
      res.status(401).json({
        success: false,
        message: "User not authenticated",
      });
      return;
    }

    const profile = await LogisticsProviderProfile.findOne({ user_id });
    if (!profile) {
      res.status(404).json({
        success: false,
        message: "Logistics provider profile not found",
      });
      return;
    }

    const vehicle = await Vehicle.findOne({ id });
    if (!vehicle) {
      res.status(404).json({
        success: false,
        message: "Vehicle not found",
      });
      return;
    }

    if (vehicle.logistics_provider_profile_id !== profile.id) {
      res.status(403).json({
        success: false,
        message: "You are not authorized to delete this vehicle",
      });
      return;
    }

    const activeShipment = await Shipment.findOne({
      vehicle_id: id,
      status: { $in: ["CREATED", "DISPATCHED", "IN_TRANSIT"] },
    });

    if (activeShipment) {
      res.status(400).json({
        success: false,
        message: "Cannot delete vehicle with active shipments",
      });
      return;
    }

    await Vehicle.findOneAndDelete({ id });

    res.status(200).json({
      success: true,
      message: "Vehicle deleted successfully",
    });
  } catch (error) {
    next(error);
  }
};
