import { Request, Response, NextFunction } from "express";
import StorageFacility, { IStorageFacility } from "../models/StorageFacility";
import { FilterQuery } from "mongoose";

export const createStorageFacility = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    if (!req.user?.userId) {
      res.status(401).json({
        success: false,
        message: "User not authenticated",
      });
      return;
    }

    const body = req.body;
    const facilities = Array.isArray(body) ? body : [body];

    for (const facility of facilities) {
      const {
        name,
        location_latitude,
        location_longitude,
        capacity,
        pricing_per_unit,
      } = facility;

      if (
        !name ||
        location_latitude === undefined ||
        location_longitude === undefined ||
        capacity === undefined ||
        pricing_per_unit === undefined
      ) {
        res.status(400).json({
          success: false,
          message:
            "All fields are required: name, location_latitude, location_longitude, capacity, pricing_per_unit",
        });
        return;
      }
    }

    const createdFacilities = await StorageFacility.create(
      facilities.map((facility) => ({
        name: facility.name,
        location_latitude: facility.location_latitude,
        location_longitude: facility.location_longitude,
        capacity: facility.capacity,
        availability: true,
        pricing_per_unit: facility.pricing_per_unit,
      })),
    );

    res.status(201).json({
      success: true,
      data: Array.isArray(body) ? createdFacilities : createdFacilities[0],
      count: createdFacilities.length,
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

    const facility = await StorageFacility.findOne({ id });
    if (!facility) {
      res.status(404).json({
        success: false,
        message: "Storage facility not found",
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

    const facility = await StorageFacility.findOne({ id });
    if (!facility) {
      res.status(404).json({
        success: false,
        message: "Storage facility not found",
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
