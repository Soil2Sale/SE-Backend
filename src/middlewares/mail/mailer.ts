import axios from "axios";
import { resetPasswordTemplate } from "./templates/resetPasswordTemplate";
import { otpEmailTemplate } from "./templates/otpTemplate";

const apiKey = process.env.BREVO_API_KEY;
const senderEmail = process.env.DEFAULT_FROM_EMAIL;
const senderName = process.env.EMAIL_FROM_NAME || "AgriConnect";

if (!apiKey) {
    throw new Error("BREVO_API_KEY not configured");
}
if (!senderEmail) {
    throw new Error("DEFAULT_FROM_EMAIL not configured");
}

export const sendResetPasswordEmail = async (
  to: string,
  resetLink: string,
): Promise<void> => {
  const payload = {
      sender: { email: senderEmail, name: senderName },
      to: [{ email: to }],
      subject: "Password Reset Request",
      html: resetPasswordTemplate(resetLink),
  };

  const res = await axios.post("https://api.brevo.com/v3/smtp/email", payload, {
      headers: { "api-key": apiKey, "Content-Type": "application/json" },
      timeout: 15000,
  });
};

export const sendOTPEmail = async (to: string, otp: string): Promise<void> => {
  const payload = {
      sender: { email: senderEmail, name: senderName },
      to: [{ email: to }],
      subject: "Your AgriConnect OTP",
      htmlContent: otpEmailTemplate(otp),
  };

  const res = await axios.post("https://api.brevo.com/v3/smtp/email", payload, {
      headers: { "api-key": apiKey, "Content-Type": "application/json" },
      timeout: 15000,
  });

  console.log("OTP email sent:", res);
};
