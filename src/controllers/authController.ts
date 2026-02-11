import { Request, Response, NextFunction } from "express";
import User from "../models/User";
import RefreshToken from "../models/RefreshToken";
import {
  generateAccessToken,
  generateRefreshToken,
  verifyRefreshToken,
  getRefreshTokenExpiry,
} from "../utils/jwt";
import { sendOTPEmail } from "../middlewares/mail/mailer";
import { generateOTP, validateOTP } from "../middlewares/otp/otpService";
import { sendOTPViaTelegram } from "../middlewares/otp/otpSender";
import { createAuditLog } from "../utils/auditLogger";
import { AuditAction } from "../models/AuditLog";

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

    if (!name || !mobile_number || !role) {
      res.status(400).json({
        success: false,
        message: "Name, phone, email, and role are required",
      });
      return;
    }

    // const existingUser = await User.findOne({
    //   $or: [{ mobile_number }, { recovery_email }],
    // });

    // if (existingUser) {
    //   res.status(400).json({
    //     success: false,
    //     message: "User with this phone or email already exists",
    //   });
    //   return;
    // }

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
      message:
        "User registered successfully. Please link your Telegram and verify OTP.",
      data: {
        user: userResponse,
        telegram_bot_link: `https://t.me/${process.env.TELEGRAM_BOT_USERNAME}?start=${user.id}`,
        note: "Click the Telegram link to receive your verification OTP. You have 5 minutes to verify.",
      },
    });
  } catch (error) {
    next(error);
  }
};

export const verifyRegistrationOtp = async (
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

    if (user.is_verified) {
      res.status(400).json({
        success: false,
        message: "User already verified",
      });
      return;
    }

    if (!user.is_telegram_linked) {
      res.status(400).json({
        success: false,
        message: "Please link your Telegram account first",
        data: {
          telegram_bot_link: `https://t.me/${process.env.TELEGRAM_BOT_USERNAME}?start=${user.id}`,
        },
      });
      return;
    }

    const isValid = validateOTP(otp, user.otp_secret);
    if (!isValid) {
      res.status(401).json({
        success: false,
        message: "Invalid or expired OTP",
      });
      return;
    }

    user.is_verified = true;
    await user.save();

    const userResponse = user.toObject() as any;
    delete userResponse.otp_secret;

    res.status(200).json({
      success: true,
      message: "Registration verified successfully! You can now login.",
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

    const query = isEmail
      ? { recovery_email: identifier }
      : { mobile_number: identifier };
    const user = await User.findOne(query);

    if (!user) {
      res.status(404).json({
        success: false,
        message: "User not found",
      });
      return;
    }

    if (!user.is_verified) {
      res.status(400).json({
        success: false,
        message:
          "Account not verified. Please complete registration verification first.",
        code: "ACCOUNT_NOT_VERIFIED",
        data: {
          telegram_bot_link: !user.is_telegram_linked
            ? `https://t.me/${process.env.TELEGRAM_BOT_USERNAME}?start=${user.id}`
            : undefined,
        },
      });
      return;
    }

    if (!user.is_telegram_linked) {
      res.status(400).json({
        success: false,
        message: "Telegram not linked. Please link your Telegram first.",
        code: "TELEGRAM_NOT_LINKED",
        data: {
          telegram_bot_link: `https://t.me/${process.env.TELEGRAM_BOT_USERNAME}?start=${user.id}`,
        },
      });
      return;
    }

    const otp = generateOTP(user.otp_secret);

    try {
      if (isEmail) {
        await sendOTPEmail(identifier, otp);
      } else {
        await sendOTPViaTelegram(user.telegram_chat_id!, otp);
      }
    } catch (otpError) {
      const errorMessage =
        otpError instanceof Error ? otpError.message : "Failed to send OTP";
      console.error("OTP error:", otpError);

      res.status(500).json({
        success: false,
        message: errorMessage,
        error:
          process.env.NODE_ENV === "development" ? errorMessage : undefined,
      });
      return;
    }

    res.status(200).json({
      success: true,
      message: `OTP sent successfully to your ${isEmail ? "email" : "mobile number"}`,
      data: {
        userId: user.id,
        method: isEmail ? "email" : "telegram",
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

    const isValid = validateOTP(otp, user.otp_secret);
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

    const accessToken = generateAccessToken(
      user.id,
      user.mobile_number,
      user.role,
    );
    const refreshToken = generateRefreshToken(
      user.id,
      user.mobile_number,
      user.role,
    );

    await RefreshToken.createToken(
      user.id,
      refreshToken,
      getRefreshTokenExpiry(),
    );

    console.log("Generated Refresh Token:", refreshToken);

    setRefreshTokenCookie(res, refreshToken);

    const userResponse = user.toObject() as any;
    delete userResponse.otp_secret;

    // Create audit log for successful login
    await createAuditLog(user.id, AuditAction.USER_LOGIN, "User", user.id);

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
    console.log(req.cookies);
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
        { revoked_at: new Date() },
      );
      res.status(401).json({
        success: false,
        message: "User not found",
      });
      return;
    }

    const newAccessToken = generateAccessToken(
      user.id,
      user.mobile_number,
      user.role,
    );

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
    const userId = req.user?.userId;

    if (refreshToken) {
      const storedToken = await RefreshToken.verifyToken(refreshToken);
      if (storedToken) {
        await RefreshToken.updateOne(
          { id: storedToken.id },
          { revoked_at: new Date() },
        );

        // Create audit log for token revocation
        if (userId) {
          await createAuditLog(
            userId,
            AuditAction.TOKEN_REVOKED,
            "RefreshToken",
            storedToken.id,
          );
        }
      }
    }

    // Create audit log for logout
    if (userId) {
      await createAuditLog(userId, AuditAction.USER_LOGOUT, "User", userId);
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
