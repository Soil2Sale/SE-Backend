import crypto from "crypto";

export const generateOTP = (secret: string): string => {
  const hash = crypto
    .createHmac("sha256", secret)
    .update(Date.now().toString())
    .digest("hex");
  const otp = parseInt(hash.substring(0, 8), 16) % 1000000;
  return otp.toString().padStart(6, "0");
};

export const validateOTP = (
  otp: string,
  secret: string,
  timeWindowMinutes: number = 5,
): boolean => {
  const currentTime = Date.now();
  const timeWindow = timeWindowMinutes * 60 * 1000;

  for (let i = 0; i <= timeWindowMinutes; i++) {
    const testTime = currentTime - i * 60 * 1000;
    const hash = crypto
      .createHmac("sha256", secret)
      .update(testTime.toString())
      .digest("hex");
    const generatedOtp = parseInt(hash.substring(0, 8), 16) % 1000000;
    const otpString = generatedOtp.toString().padStart(6, "0");

    if (otpString === otp) {
      return true;
    }
  }

  return false;
};

export const generateOTPSecret = (): string => {
  return crypto.randomBytes(32).toString("hex");
};
