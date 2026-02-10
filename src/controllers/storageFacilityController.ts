import { Request, Response, NextFunction } from "express";
import StorageFacility, { IStorageFacility } from "../models/StorageFacility";
import LogisticsProviderProfile from "../models/LogisticsProviderProfile";
import { FilterQuery } from "mongoose";

export const createStorageFacility = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const {
      name,
      location_latitude,
      location_longitude,
      capacity,
      pricing_per_unit,
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

    const facility = await StorageFacility.create({
      logistics_provider_profile_id: profile.id,
      logistics_provider_user_id: user_id,
      name,
      location_latitude,
      location_longitude,
      capacity,
      availability: true,
      pricing_per_unit,
    });

    res.status(201).json({
      success: true,
      data: facility,
    });
  } catch (error) {
    next(error);
  }
};

export const getStorageFacilitiesByProvider = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { providerId } = req.params;
    const { availability } = req.query;

    const filter: FilterQuery<IStorageFacility> = {
      logistics_provider_profile_id: providerId,
    };
    if (availability !== undefined) {
      filter.availability = availability === "true";
    }

    const facilities = await StorageFacility.find(filter)
      .populate("logistics_provider_profile_id", "company_name verified")
      .sort({ created_at: -1 });

    res.status(200).json({
      success: true,
      data: facilities,
      count: facilities.length,
    });
  } catch (error) {
    next(error);
  }
};

export const getStorageFacilitiesByUser = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const user_id = req.user?.userId;
    const { availability } = req.query;

    if (!user_id) {
      res.status(401).json({
        success: false,
        message: "User not authenticated",
      });
      return;
    }

    const filter: FilterQuery<IStorageFacility> = {
      logistics_provider_user_id: user_id,
    };
    if (availability !== undefined) {
      filter.availability = availability === "true";
    }

    const facilities = await StorageFacility.find(filter).sort({
      created_at: -1,
    });

    res.status(200).json({
      success: true,
      data: facilities,
      count: facilities.length,
    });
  } catch (error) {
    next(error);
  }
};

export const getStorageFacilityById = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { id } = req.params;

    const facility = await StorageFacility.findOne({ id }).populate(
      "logistics_provider_profile_id",
      "company_name verified",
    );

    if (!facility) {
      res.status(404).json({
        success: false,
        message: "Storage facility not found",
      });
      return;
    }

    res.status(200).json({
      success: true,
      data: facility,
    });
  } catch (error) {
    next(error);
  }
};

export const updateStorageFacility = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { id } = req.params;
    const { name, capacity, availability, pricing_per_unit } = req.body;
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

    const facility = await StorageFacility.findOne({ id });
    if (!facility) {
      res.status(404).json({
        success: false,
        message: "Storage facility not found",
      });
      return;
    }

    if (facility.logistics_provider_profile_id !== profile.id) {
      res.status(403).json({
        success: false,
        message: "You are not authorized to update this facility",
      });
      return;
    }

    const updateData: Partial<IStorageFacility> = {};
    if (name) updateData.name = name;
    if (capacity !== undefined) updateData.capacity = capacity;
    if (availability !== undefined) updateData.availability = availability;
    if (pricing_per_unit !== undefined)
      updateData.pricing_per_unit = pricing_per_unit;

    const updatedFacility = await StorageFacility.findOneAndUpdate(
      { id },
      updateData,
      { new: true, runValidators: true },
    );

    res.status(200).json({
      success: true,
      data: updatedFacility,
    });
  } catch (error) {
    next(error);
  }
};

export const deleteStorageFacility = async (
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

    const facility = await StorageFacility.findOne({ id });
    if (!facility) {
      res.status(404).json({
        success: false,
        message: "Storage facility not found",
      });
      return;
    }

    if (facility.logistics_provider_profile_id !== profile.id) {
      res.status(403).json({
        success: false,
        message: "You are not authorized to delete this facility",
      });
      return;
    }

    await StorageFacility.findOneAndDelete({ id });

    res.status(200).json({
      success: true,
      message: "Storage facility deleted successfully",
    });
  } catch (error) {
    next(error);
  }
};
