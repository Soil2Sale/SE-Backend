import { Request, Response, NextFunction } from "express";
import User, { IUser } from "../models/User";

export const getProfile = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const userId = req.user?.userId;

    if (!userId) {
      res.status(401).json({
        success: false,
        message: "User not authenticated",
      });
      return;
    }

    const user = await User.findOne({ id: userId });

    if (!user) {
      res.status(404).json({
        success: false,
        message: "User not found",
      });
      return;
    }

    res.status(200).json({
      success: true,
      data: user,
    });
  } catch (error) {
    next(error);
  }
};

export const getAllUsers = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const users = await User.find();
    res.status(200).json({
      success: true,
      count: users.length,
      data: users,
    });
  } catch (error) {
    next(error);
  }
};

export const getUserById = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const user = await User.findOne({ id: req.params.id });

    if (!user) {
      res.status(404).json({
        success: false,
        message: "User not found",
      });
      return;
    }

    res.status(200).json({
      success: true,
      data: user,
    });
  } catch (error) {
    next(error);
  }
};

export const getUserByRole = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const role = req.query.role as string;

    if (!role) {
      res.status(400).json({
        success: false,
        message: "Role query parameter is required",
      });
      return;
    }

    const users = (await User.find({ role })) || [];

    res.status(200).json({
      success: true,
      count: users.length,
      data: users,
    });
  } catch (error) {
    next(error);
  }
};

export const createUser = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { name, mobile_number, role, recovery_email } = req.body;

    const existingUser = await User.findOne({ mobile_number });
    if (existingUser) {
      res.status(400).json({
        success: false,
        message: "User with this mobile number already exists",
      });
      return;
    }

    const user = await User.create({
      name,
      mobile_number,
      role,
      recovery_email,
    });

    res.status(201).json({
      success: true,
      data: user,
    });
  } catch (error) {
    next(error);
  }
};

export const updateUser = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { name, mobile_number, recovery_email, role } = req.body;

    const updateData: Partial<IUser> = {};
    if (name) updateData.name = name;
    if (mobile_number) updateData.mobile_number = mobile_number;
    if (recovery_email) updateData.recovery_email = recovery_email;
    if (role) updateData.role = role;

    const user = await User.findOneAndUpdate(
      { id: req.params.id },
      updateData,
      { new: true, runValidators: true },
    );

    if (!user) {
      res.status(404).json({
        success: false,
        message: "User not found",
      });
      return;
    }

    res.status(200).json({
      success: true,
      data: user,
    });
  } catch (error) {
    next(error);
  }
};

export const deactivateUser = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const user = await User.findOneAndUpdate(
      { id: req.params.id },
      { is_active: false },
      { new: true },
    );

    if (!user) {
      res.status(404).json({
        success: false,
        message: "User not found",
      });
      return;
    }

    res.status(200).json({
      success: true,
      message: "User deactivated successfully",
    });
  } catch (error) {
    next(error);
  }
};

export const activateUser = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const user = await User.findOneAndUpdate(
      { id: req.params.id },
      { is_active: true },
      { new: true },
    );

    if (!user) {
      res.status(404).json({
        success: false,
        message: "User not found",
      });
      return;
    }

    res.status(200).json({
      success: true,
      message: "User activated successfully",
    });
  } catch (error) {
    next(error);
  }
};
