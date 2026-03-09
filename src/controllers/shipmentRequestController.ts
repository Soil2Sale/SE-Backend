import { Request, Response, NextFunction } from "express";
import { v4 as uuidv4 } from "uuid";
import { FilterQuery } from "mongoose";
import ShipmentRequest, {
  IShipmentRequest,
  ShipmentRequestStatus,
  NegotiationRole,
  NegotiationAction,
} from "../models/ShipmentRequest";
import Shipment, { ShipmentStatus } from "../models/Shipment";
import Order from "../models/Order";
import LogisticsProviderProfile from "../models/LogisticsProviderProfile";
import Vehicle from "../models/Vehicle";
import { createAuditLog } from "../utils/auditLogger";
import { AuditAction } from "../models/AuditLog";

// POST /shipment-requests — Farmer creates a shipment request
export const createShipmentRequest = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const farmer_user_id = req.user?.userId;
    if (!farmer_user_id) {
      res
        .status(401)
        .json({ success: false, message: "User not authenticated" });
      return;
    }

    const {
      order_id,
      logistics_provider_profile_id: logistics_provider_profile_id_body,
      logistics_provider_id,
      origin_latitude,
      origin_longitude,
      destination_latitude,
      destination_longitude,
      proposed_cost,
      proposed_duration_days,
    } = req.body;

    const logistics_provider_profile_id =
      logistics_provider_profile_id_body ?? logistics_provider_id;

    if (
      !order_id ||
      !logistics_provider_profile_id ||
      origin_latitude === undefined ||
      origin_longitude === undefined ||
      destination_latitude === undefined ||
      destination_longitude === undefined ||
      proposed_cost === undefined ||
      proposed_duration_days === undefined
    ) {
      res
        .status(400)
        .json({ success: false, message: "All required fields are missing" });
      return;
    }

    const order = await Order.findOne({ id: order_id });
    if (!order) {
      res.status(404).json({ success: false, message: "Order not found" });
      return;
    }

    if (order.sender_user_id !== farmer_user_id) {
      res.status(403).json({
        success: false,
        message:
          "You are not authorized to create a shipment request for this order",
      });
      return;
    }

    const logisticsProfile = await LogisticsProviderProfile.findOne({
      id: logistics_provider_profile_id,
    });
    if (!logisticsProfile) {
      res.status(404).json({
        success: false,
        message: "Logistics provider profile not found",
      });
      return;
    }

    // Only one active request per order+provider combination
    const existing = await ShipmentRequest.findOne({
      order_id,
      logistics_provider_profile_id,
      status: {
        $in: [
          ShipmentRequestStatus.PENDING,
          ShipmentRequestStatus.COUNTERED_BY_LOGISTICS,
          ShipmentRequestStatus.COUNTERED_BY_FARMER,
          ShipmentRequestStatus.ACCEPTED,
        ],
      },
    });
    if (existing) {
      res.status(400).json({
        success: false,
        message:
          "An active shipment request already exists for this order and provider",
      });
      return;
    }

    const shipmentRequest = await ShipmentRequest.create({
      order_id,
      farmer_user_id,
      buyer_user_id: order.buyer_user_id,
      logistics_provider_profile_id,
      logistics_provider_user_id: logisticsProfile.user_id,
      origin_latitude,
      origin_longitude,
      destination_latitude,
      destination_longitude,
      proposed_cost,
      proposed_duration_days,
      current_proposed_cost: proposed_cost,
      current_proposed_duration_days: proposed_duration_days,
      status: ShipmentRequestStatus.PENDING,
      negotiations: [
        {
          actor_user_id: farmer_user_id,
          role: NegotiationRole.FARMER,
          action: NegotiationAction.PROPOSED,
          proposed_cost,
          proposed_duration_days,
          created_at: new Date(),
        },
      ],
    });

    await createAuditLog(
      farmer_user_id,
      AuditAction.SHIPMENT_REQUEST_CREATED,
      "ShipmentRequest",
      shipmentRequest.id,
    );

    res.status(201).json({ success: true, data: shipmentRequest });
  } catch (error) {
    next(error);
  }
};

// GET /shipment-requests — Role-filtered list
export const getShipmentRequests = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const user_id = req.user?.userId;
    if (!user_id) {
      res
        .status(401)
        .json({ success: false, message: "User not authenticated" });
      return;
    }

    const { status, page = "1", limit = "20" } = req.query;

    // Determine role filter: farmer, logistics, or buyer
    const filter: FilterQuery<IShipmentRequest> = {
      $or: [
        { farmer_user_id: user_id },
        { logistics_provider_user_id: user_id },
        { buyer_user_id: user_id },
      ],
    };

    if (status) {
      filter.status = status as ShipmentRequestStatus;
    }

    const pageNum = Math.max(1, Number(page));
    const limitNum = Math.min(100, Math.max(1, Number(limit)));
    const skip = (pageNum - 1) * limitNum;

    const [requests, total] = await Promise.all([
      ShipmentRequest.find(filter)
        .sort({ created_at: -1 })
        .skip(skip)
        .limit(limitNum),
      ShipmentRequest.countDocuments(filter),
    ]);

    res.status(200).json({
      success: true,
      data: requests,
      count: requests.length,
      total,
      page: pageNum,
      totalPages: Math.ceil(total / limitNum),
    });
  } catch (error) {
    next(error);
  }
};

// GET /shipment-requests/:id — Single request detail
export const getShipmentRequestById = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const user_id = req.user?.userId;
    if (!user_id) {
      res
        .status(401)
        .json({ success: false, message: "User not authenticated" });
      return;
    }

    const { id } = req.params;
    const shipmentRequest = await ShipmentRequest.findOne({ id });

    if (!shipmentRequest) {
      res
        .status(404)
        .json({ success: false, message: "Shipment request not found" });
      return;
    }

    // Only involved parties can view
    const isInvolved =
      shipmentRequest.farmer_user_id === user_id ||
      shipmentRequest.logistics_provider_user_id === user_id ||
      shipmentRequest.buyer_user_id === user_id;

    if (!isInvolved) {
      res.status(403).json({
        success: false,
        message: "You are not authorized to view this shipment request",
      });
      return;
    }

    res.status(200).json({ success: true, data: shipmentRequest });
  } catch (error) {
    next(error);
  }
};

// PATCH /shipment-requests/:id/respond — Logistics provider responds
export const respondToShipmentRequest = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const user_id = req.user?.userId;
    if (!user_id) {
      res
        .status(401)
        .json({ success: false, message: "User not authenticated" });
      return;
    }

    const { id } = req.params;
    const {
      action,
      proposed_cost,
      proposed_duration_days,
      vehicle_id,
      message,
    } = req.body;

    if (!action || !["accept", "counter", "reject"].includes(action)) {
      res.status(400).json({
        success: false,
        message: "action must be one of: accept, counter, reject",
      });
      return;
    }

    const shipmentRequest = await ShipmentRequest.findOne({ id });
    if (!shipmentRequest) {
      res
        .status(404)
        .json({ success: false, message: "Shipment request not found" });
      return;
    }

    if (shipmentRequest.logistics_provider_user_id !== user_id) {
      res.status(403).json({
        success: false,
        message:
          "Only the assigned logistics provider can respond to this request",
      });
      return;
    }

    const respondableStatuses = [
      ShipmentRequestStatus.PENDING,
      ShipmentRequestStatus.COUNTERED_BY_FARMER,
    ];
    if (!respondableStatuses.includes(shipmentRequest.status)) {
      res.status(400).json({
        success: false,
        message: `Cannot respond to a request with status ${shipmentRequest.status}`,
      });
      return;
    }

    if (action === "accept") {
      if (!vehicle_id) {
        res.status(400).json({
          success: false,
          message: "vehicle_id is required when accepting",
        });
        return;
      }

      const vehicle = await Vehicle.findOne({ id: vehicle_id });
      if (!vehicle) {
        res.status(404).json({ success: false, message: "Vehicle not found" });
        return;
      }

      const profile = await LogisticsProviderProfile.findOne({
        id: shipmentRequest.logistics_provider_profile_id,
      });
      if (!profile || vehicle.logistics_provider_profile_id !== profile.id) {
        res.status(403).json({
          success: false,
          message: "Vehicle does not belong to this logistics company",
        });
        return;
      }

      if (!vehicle.available) {
        res
          .status(400)
          .json({ success: false, message: "Vehicle is not available" });
        return;
      }

      shipmentRequest.vehicle_id = vehicle_id;
      shipmentRequest.status = ShipmentRequestStatus.ACCEPTED;
      shipmentRequest.negotiations.push({
        actor_user_id: user_id,
        role: NegotiationRole.LOGISTICS,
        action: NegotiationAction.ACCEPTED,
        proposed_cost: shipmentRequest.current_proposed_cost,
        proposed_duration_days: shipmentRequest.current_proposed_duration_days,
        message,
        created_at: new Date(),
      });

      // Auto-create Shipment so tracking is available immediately
      const tracking_code = `TRK${uuidv4().substring(0, 8).toUpperCase()}`;
      const shipment = await Shipment.create({
        order_id: shipmentRequest.order_id,
        logistics_provider_profile_id:
          shipmentRequest.logistics_provider_profile_id,
        logistics_provider_user_id: shipmentRequest.logistics_provider_user_id,
        vehicle_id,
        origin_latitude: shipmentRequest.origin_latitude,
        origin_longitude: shipmentRequest.origin_longitude,
        destination_latitude: shipmentRequest.destination_latitude,
        destination_longitude: shipmentRequest.destination_longitude,
        estimated_cost: shipmentRequest.current_proposed_cost,
        status: ShipmentStatus.CREATED,
        tracking_code,
      });

      vehicle.available = false;
      await vehicle.save();

      shipmentRequest.shipment_id = shipment.id;

      await createAuditLog(
        user_id,
        AuditAction.SHIPMENT_CREATED,
        "Shipment",
        shipment.id,
      );
    } else if (action === "counter") {
      if (proposed_cost === undefined || proposed_duration_days === undefined) {
        res.status(400).json({
          success: false,
          message:
            "proposed_cost and proposed_duration_days are required for a counter",
        });
        return;
      }

      shipmentRequest.current_proposed_cost = proposed_cost;
      shipmentRequest.current_proposed_duration_days = proposed_duration_days;
      if (vehicle_id) shipmentRequest.vehicle_id = vehicle_id;
      shipmentRequest.status = ShipmentRequestStatus.COUNTERED_BY_LOGISTICS;
      shipmentRequest.negotiations.push({
        actor_user_id: user_id,
        role: NegotiationRole.LOGISTICS,
        action: NegotiationAction.COUNTERED,
        proposed_cost,
        proposed_duration_days,
        message,
        created_at: new Date(),
      });
    } else {
      // reject
      shipmentRequest.status = ShipmentRequestStatus.REJECTED;
      shipmentRequest.negotiations.push({
        actor_user_id: user_id,
        role: NegotiationRole.LOGISTICS,
        action: NegotiationAction.REJECTED,
        proposed_cost: shipmentRequest.current_proposed_cost,
        proposed_duration_days: shipmentRequest.current_proposed_duration_days,
        message,
        created_at: new Date(),
      });
    }

    await shipmentRequest.save();

    await createAuditLog(
      user_id,
      AuditAction.SHIPMENT_REQUEST_RESPONDED,
      "ShipmentRequest",
      shipmentRequest.id,
    );

    res.status(200).json({ success: true, data: shipmentRequest });
  } catch (error) {
    next(error);
  }
};

// PATCH /shipment-requests/:id/counter — Farmer counter-proposes
export const counterShipmentRequest = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const user_id = req.user?.userId;
    if (!user_id) {
      res
        .status(401)
        .json({ success: false, message: "User not authenticated" });
      return;
    }

    const { id } = req.params;
    const { proposed_cost, proposed_duration_days, message } = req.body;

    if (proposed_cost === undefined || proposed_duration_days === undefined) {
      res.status(400).json({
        success: false,
        message: "proposed_cost and proposed_duration_days are required",
      });
      return;
    }

    const shipmentRequest = await ShipmentRequest.findOne({ id });
    if (!shipmentRequest) {
      res
        .status(404)
        .json({ success: false, message: "Shipment request not found" });
      return;
    }

    if (shipmentRequest.farmer_user_id !== user_id) {
      res.status(403).json({
        success: false,
        message: "Only the farmer can counter-propose",
      });
      return;
    }

    if (
      shipmentRequest.status !== ShipmentRequestStatus.COUNTERED_BY_LOGISTICS
    ) {
      res.status(400).json({
        success: false,
        message:
          "Can only counter when logistics provider has made a counter-proposal",
      });
      return;
    }

    shipmentRequest.current_proposed_cost = proposed_cost;
    shipmentRequest.current_proposed_duration_days = proposed_duration_days;
    shipmentRequest.status = ShipmentRequestStatus.COUNTERED_BY_FARMER;
    shipmentRequest.negotiations.push({
      actor_user_id: user_id,
      role: NegotiationRole.FARMER,
      action: NegotiationAction.COUNTERED,
      proposed_cost,
      proposed_duration_days,
      message,
      created_at: new Date(),
    });

    await shipmentRequest.save();

    await createAuditLog(
      user_id,
      AuditAction.SHIPMENT_REQUEST_COUNTERED,
      "ShipmentRequest",
      shipmentRequest.id,
    );

    res.status(200).json({ success: true, data: shipmentRequest });
  } catch (error) {
    next(error);
  }
};

// GET /shipment-requests/:id/negotiations — Full negotiation log
export const getShipmentRequestNegotiations = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const user_id = req.user?.userId;
    if (!user_id) {
      res
        .status(401)
        .json({ success: false, message: "User not authenticated" });
      return;
    }

    const { id } = req.params;
    const shipmentRequest = await ShipmentRequest.findOne({ id });

    if (!shipmentRequest) {
      res
        .status(404)
        .json({ success: false, message: "Shipment request not found" });
      return;
    }

    const isInvolved =
      shipmentRequest.farmer_user_id === user_id ||
      shipmentRequest.logistics_provider_user_id === user_id ||
      shipmentRequest.buyer_user_id === user_id;

    if (!isInvolved) {
      res.status(403).json({
        success: false,
        message: "You are not authorized to view negotiations for this request",
      });
      return;
    }

    res.status(200).json({
      success: true,
      data: shipmentRequest.negotiations,
      count: shipmentRequest.negotiations.length,
    });
  } catch (error) {
    next(error);
  }
};

// PATCH /shipment-requests/:id/buyer-confirm — Buyer confirms, auto-creates Shipment
export const buyerConfirmShipmentRequest = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const user_id = req.user?.userId;
    if (!user_id) {
      res
        .status(401)
        .json({ success: false, message: "User not authenticated" });
      return;
    }

    const { id } = req.params;
    const shipmentRequest = await ShipmentRequest.findOne({ id });

    if (!shipmentRequest) {
      res
        .status(404)
        .json({ success: false, message: "Shipment request not found" });
      return;
    }

    if (shipmentRequest.buyer_user_id !== user_id) {
      res.status(403).json({
        success: false,
        message: "Only the buyer can confirm a shipment request",
      });
      return;
    }

    if (shipmentRequest.status !== ShipmentRequestStatus.ACCEPTED) {
      res.status(400).json({
        success: false,
        message:
          "Shipment request must be in ACCEPTED status before buyer can confirm",
      });
      return;
    }

    if (
      !shipmentRequest.vehicle_id ||
      !shipmentRequest.logistics_provider_profile_id ||
      !shipmentRequest.logistics_provider_user_id
    ) {
      res.status(400).json({
        success: false,
        message: "Shipment request is missing vehicle or provider details",
      });
      return;
    }

    // Shipment was already created when logistics provider accepted
    const shipment = shipmentRequest.shipment_id
      ? await Shipment.findOne({ id: shipmentRequest.shipment_id })
      : null;

    shipmentRequest.status = ShipmentRequestStatus.CONFIRMED;
    await shipmentRequest.save();

    await createAuditLog(
      user_id,
      AuditAction.SHIPMENT_REQUEST_CONFIRMED,
      "ShipmentRequest",
      shipmentRequest.id,
    );

    res.status(200).json({
      success: true,
      data: { shipmentRequest, shipment },
    });
  } catch (error) {
    next(error);
  }
};

// PATCH /shipment-requests/:id/buyer-reject — Buyer rejects, resets to PENDING
export const buyerRejectShipmentRequest = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const user_id = req.user?.userId;
    if (!user_id) {
      res
        .status(401)
        .json({ success: false, message: "User not authenticated" });
      return;
    }

    const { id } = req.params;
    const shipmentRequest = await ShipmentRequest.findOne({ id });

    if (!shipmentRequest) {
      res
        .status(404)
        .json({ success: false, message: "Shipment request not found" });
      return;
    }

    if (shipmentRequest.buyer_user_id !== user_id) {
      res.status(403).json({
        success: false,
        message: "Only the buyer can reject a shipment request",
      });
      return;
    }

    if (shipmentRequest.status !== ShipmentRequestStatus.ACCEPTED) {
      res.status(400).json({
        success: false,
        message:
          "Shipment request must be in ACCEPTED status for buyer to reject",
      });
      return;
    }

    // Clean up the shipment that was created on accept and restore vehicle availability
    if (shipmentRequest.shipment_id) {
      await Shipment.deleteOne({ id: shipmentRequest.shipment_id });
    }
    if (shipmentRequest.vehicle_id) {
      await Vehicle.updateOne(
        { id: shipmentRequest.vehicle_id },
        { available: true },
      );
    }

    // Reset so farmer can pick another provider
    shipmentRequest.status = ShipmentRequestStatus.PENDING;
    shipmentRequest.shipment_id = undefined;
    shipmentRequest.logistics_provider_profile_id = undefined;
    shipmentRequest.logistics_provider_user_id = undefined;
    shipmentRequest.vehicle_id = undefined;
    shipmentRequest.current_proposed_cost = shipmentRequest.proposed_cost;
    shipmentRequest.current_proposed_duration_days =
      shipmentRequest.proposed_duration_days;
    shipmentRequest.negotiations = [];

    await shipmentRequest.save();

    await createAuditLog(
      user_id,
      AuditAction.SHIPMENT_REQUEST_REJECTED,
      "ShipmentRequest",
      shipmentRequest.id,
    );

    res.status(200).json({ success: true, data: shipmentRequest });
  } catch (error) {
    next(error);
  }
};
