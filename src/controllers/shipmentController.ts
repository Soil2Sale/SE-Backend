import { Request, Response, NextFunction } from "express";
import Shipment, { IShipment, ShipmentStatus } from "../models/Shipment";
import Order, { OrderStatus } from "../models/Order";
import LogisticsProviderProfile from "../models/LogisticsProviderProfile";
import Vehicle from "../models/Vehicle";
import { FilterQuery } from "mongoose";
import { v4 as uuidv4 } from "uuid";

export const createShipment = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const {
      order_id,
      vehicle_id,
      origin_latitude,
      origin_longitude,
      destination_latitude,
      destination_longitude,
      estimated_cost,
    } = req.body;
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

    const order = await Order.findOne({ id: order_id });
    if (!order) {
      res.status(404).json({
        success: false,
        message: "Order not found",
      });
      return;
    }

    const vehicle = await Vehicle.findOne({ id: vehicle_id });
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
        message: "Vehicle does not belong to your logistics company",
      });
      return;
    }

    if (!vehicle.available) {
      res.status(400).json({
        success: false,
        message: "Vehicle is not available",
      });
      return;
    }

    const tracking_code = `TRK${uuidv4().substring(0, 8).toUpperCase()}`;

    const shipment = await Shipment.create({
      order_id,
      logistics_provider_profile_id: profile.id,
      logistics_provider_user_id: user_id,
      vehicle_id,
      origin_latitude,
      origin_longitude,
      destination_latitude,
      destination_longitude,
      estimated_cost,
      status: ShipmentStatus.CREATED,
      tracking_code,
    });

    vehicle.available = false;
    await vehicle.save();

    res.status(201).json({
      success: true,
      data: shipment,
    });
  } catch (error) {
    next(error);
  }
};

export const getShipmentsByOrder = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { orderId } = req.params;

    const shipments = await Shipment.find({ order_id: orderId })
      .populate("logistics_provider_profile_id", "company_name")
      .populate("vehicle_id", "vehicle_type capacity")
      .sort({ created_at: -1 });

    res.status(200).json({
      success: true,
      data: shipments,
      count: shipments.length,
    });
  } catch (error) {
    next(error);
  }
};

export const getShipmentsByProvider = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const user_id = req.user?.userId;
    const { status, page = "1", limit = "20" } = req.query;

    if (!user_id) {
      res.status(401).json({
        success: false,
        message: "User not authenticated",
      });
      return;
    }

    const filter: FilterQuery<IShipment> = {
      logistics_provider_user_id: user_id,
    };
    if (status) {
      filter.status = status as ShipmentStatus;
    }

    const pageNum = Math.max(1, Number(page));
    const limitNum = Math.min(100, Math.max(1, Number(limit)));
    const skip = (pageNum - 1) * limitNum;

    const [shipments, total] = await Promise.all([
      Shipment.find(filter)
        .populate("order_id")
        .populate("vehicle_id", "vehicle_type capacity")
        .sort({ created_at: -1 })
        .skip(skip)
        .limit(limitNum),
      Shipment.countDocuments(filter),
    ]);

    res.status(200).json({
      success: true,
      data: shipments,
      count: shipments.length,
      total,
      page: pageNum,
      totalPages: Math.ceil(total / limitNum),
    });
  } catch (error) {
    next(error);
  }
};

export const getShipmentById = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { id } = req.params;

    const shipment = await Shipment.findOne({ id })
      .populate("order_id")
      .populate("logistics_provider_profile_id", "company_name")
      .populate("vehicle_id", "vehicle_type capacity");

    if (!shipment) {
      res.status(404).json({
        success: false,
        message: "Shipment not found",
      });
      return;
    }

    res.status(200).json({
      success: true,
      data: shipment,
    });
  } catch (error) {
    next(error);
  }
};

export const updateShipmentStatus = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { id } = req.params;
    const { status } = req.body;
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

    const shipment = await Shipment.findOne({ id });
    if (!shipment) {
      res.status(404).json({
        success: false,
        message: "Shipment not found",
      });
      return;
    }

    if (shipment.logistics_provider_profile_id !== profile.id) {
      res.status(403).json({
        success: false,
        message: "You are not authorized to update this shipment",
      });
      return;
    }

    shipment.status = status;
    await shipment.save();

    if (status === ShipmentStatus.DELIVERED) {
      const order = await Order.findOne({ id: shipment.order_id });
      if (order) {
        order.status = OrderStatus.COMPLETED;
        await order.save();
      }

      const vehicle = await Vehicle.findOne({ id: shipment.vehicle_id });
      if (vehicle) {
        vehicle.available = true;
        await vehicle.save();
      }
    }

    res.status(200).json({
      success: true,
      data: shipment,
    });
  } catch (error) {
    next(error);
  }
};

export const confirmDelivery = async (
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

    const shipment = await Shipment.findOne({ id });
    if (!shipment) {
      res.status(404).json({
        success: false,
        message: "Shipment not found",
      });
      return;
    }

    if (shipment.logistics_provider_profile_id !== profile.id) {
      res.status(403).json({
        success: false,
        message: "You are not authorized to confirm delivery for this shipment",
      });
      return;
    }

    shipment.status = ShipmentStatus.DELIVERED;
    shipment.delivery_confirmed_at = new Date();
    await shipment.save();

    const order = await Order.findOne({ id: shipment.order_id });
    if (order) {
      order.status = OrderStatus.COMPLETED;
      await order.save();
    }

    const vehicle = await Vehicle.findOne({ id: shipment.vehicle_id });
    if (vehicle) {
      vehicle.available = true;
      await vehicle.save();
    }

    res.status(200).json({
      success: true,
      data: shipment,
    });
  } catch (error) {
    next(error);
  }
};

export const trackShipment = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { trackingCode } = req.params;

    const shipment = await Shipment.findOne({ tracking_code: trackingCode })
      .populate("order_id")
      .populate("logistics_provider_profile_id", "company_name")
      .populate("vehicle_id", "vehicle_type");

    if (!shipment) {
      res.status(404).json({
        success: false,
        message: "Shipment not found with this tracking code",
      });
      return;
    }

    res.status(200).json({
      success: true,
      data: shipment,
    });
  } catch (error) {
    next(error);
  }
};
