import { Request, Response, NextFunction } from "express";
import User from "../models/User";
import RefreshToken from "../models/RefreshToken";
import {
  generateAccessToken,
  generateRefreshToken,
  verifyRefreshToken,
  getRefreshTokenExpiry,
} from "../utils/jwt";
import { sendResetPasswordEmail, sendOTPEmail } from "../middlewares/mail/mailer";
import { generateOTP, validateOTP } from "../middlewares/otp/otpService";
import { sendOTPViaSMS } from "../middlewares/otp/otpSender";

const setRefreshTokenCookie = (res: Response, token: string): void => {
  const isProduction = process.env.NODE_ENV === "production";

  res.cookie("refreshToken", token, {
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction ? "strict" : "lax",
    maxAge: 7 * 24 * 60 * 60 * 1000,
    path: "/",
  });
};

export const register = async (
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

    const userResponse = user.toObject() as any;
    delete userResponse.otp_secret;

    res.status(201).json({
      success: true,
      message: "User registered successfully",
      data: {
        user: userResponse,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const login = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { identifier } = req.body;

    const isEmail = /^\S+@\S+\.\S+$/.test(identifier);
    const isMobile = /^[6-9]\d{9}$/.test(identifier);

    if (!isEmail && !isMobile) {
      res.status(400).json({
        success: false,
        message: "Invalid email or mobile number format",
      });
      return;
    }

    const query = isEmail ? { recovery_email: identifier } : { mobile_number: identifier };
    const user = await User.findOne(query);

    if (!user) {
      res.status(404).json({
        success: false,
        message: "User not found",
      });
      return;
    }

    const otp = generateOTP(user.otp_secret);

    if (isEmail) {
      await sendOTPEmail(identifier, otp);
    } else {
      await sendOTPViaSMS(identifier, otp);
    }

    res.status(200).json({
      success: true,
      message: `OTP sent successfully to your ${isEmail ? 'email' : 'mobile number'}`,
      data: {
        userId: user.id,
        method: isEmail ? 'email' : 'sms',
      },
    });
  } catch (error) {
    next(error);
  }
};

export const verifyOtp = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { userId, otp } = req.body;

    if (!userId || !otp) {
      res.status(400).json({
        success: false,
        message: "User ID and OTP are required",
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

    const isValid = validateOTP(otp, user.otp_secret, 5);
    if (!isValid) {
      res.status(401).json({
        success: false,
        message: "Invalid or expired OTP",
      });
      return;
    }

    const oldRefreshToken = req.cookies?.refreshToken;
    if (oldRefreshToken) {
      await RefreshToken.deleteMany({ user_id: user.id, revoked_at: null });
    }

    const accessToken = generateAccessToken(user.id, user.mobile_number, user.role);
    const refreshToken = generateRefreshToken(user.id, user.mobile_number, user.role);

    await RefreshToken.create({
      user_id: user.id,
      token: refreshToken,
      expires_at: getRefreshTokenExpiry(),
    });

    setRefreshTokenCookie(res, refreshToken);

    const userResponse = user.toObject() as any;
    delete userResponse.otp_secret;

    res.status(200).json({
      success: true,
      message: "Login successful",
      data: {
        user: userResponse,
        accessToken,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const refreshAccessToken = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const refreshToken = req.cookies?.refreshToken;

    if (!refreshToken) {
      res.status(401).json({
        success: false,
        message: "Refresh token not found",
      });
      return;
    }

    let decoded;
    try {
      decoded = verifyRefreshToken(refreshToken);
    } catch (error) {
      res.status(401).json({
        success: false,
        message: "Invalid or expired refresh token",
      });
      return;
    }

    const storedToken = await RefreshToken.verifyToken(refreshToken);
    if (!storedToken) {
      res.status(401).json({
        success: false,
        message: "Refresh token not found or expired",
      });
      return;
    }

    const user = await User.findOne({ id: decoded.userId });
    if (!user) {
      await RefreshToken.updateOne(
        { id: storedToken.id },
        { revoked_at: new Date() }
      );
      res.status(401).json({
        success: false,
        message: "User not found",
      });
      return;
    }

    const newAccessToken = generateAccessToken(user.id, user.mobile_number, user.role);

    res.status(200).json({
      success: true,
      message: "Access token refreshed successfully",
      data: {
        accessToken: newAccessToken,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const logout = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const refreshToken = req.cookies?.refreshToken;

    if (refreshToken) {
      const storedToken = await RefreshToken.verifyToken(refreshToken);
      if (storedToken) {
        await RefreshToken.updateOne(
          { id: storedToken.id },
          { revoked_at: new Date() }
        );
      }
    }

    res.clearCookie("refreshToken", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: process.env.NODE_ENV === "production" ? "strict" : "lax",
      path: "/",
    });

    res.status(200).json({
      success: true,
      message: "Logout successful",
    });
  } catch (error) {
    next(error);
  }
};

export const forgotPassword = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { identifier } = req.body;

    const isEmail = /^\S+@\S+\.\S+$/.test(identifier);
    const isMobile = /^[6-9]\d{9}$/.test(identifier);

    if (!isEmail && !isMobile) {
      res.status(400).json({
        success: false,
        message: "Invalid email or mobile number format",
      });
      return;
    }

    const query = isEmail ? { recovery_email: identifier } : { mobile_number: identifier };
    const user = await User.findOne(query);

    if (!user) {
      res.status(404).json({
        success: false,
        message: "User not found",
      });
      return;
    }

    const otp = generateOTP(user.otp_secret);

    if (isEmail) {
      const clientUrl = process.env.CLIENT_URL;
      const resetLink = `${clientUrl}/auth/reset-password?userId=${user.id}`;
      await sendResetPasswordEmail(identifier, resetLink);
    } else {
      await sendOTPViaSMS(identifier, otp);
    }

    res.status(200).json({
      success: true,
      message: `Reset instructions sent to your ${isEmail ? 'email' : 'mobile number'}`,
      data: {
        userId: user.id,
        method: isEmail ? 'email' : 'sms',
      },
    });
  } catch (error) {
    next(error);
  }
};
