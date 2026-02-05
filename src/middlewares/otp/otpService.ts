import crypto from "crypto";
import speakeasy from "speakeasy";

export const generateOTP = (secret: string): string => {
  return speakeasy.totp({
    secret: secret,
    encoding: "base32",   // important
    digits: 6,
    step: 60              // 60 seconds window
  });
};

export const validateOTP = (
  otp: string,
  secret: string,
): boolean => {
  return speakeasy.totp.verify({
    secret: secret,
    encoding: "base32",
    token: otp,
    step: 60,
    window: 1  // allows ±60 sec drift
  });
};

export const generateOTPSecret = (): string => {
  return crypto.randomBytes(32).toString("hex");
};
