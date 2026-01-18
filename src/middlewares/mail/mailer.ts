import nodemailer from "nodemailer";
import { resetPasswordTemplate } from "./templates/resetPasswordTemplate";

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT),
  secure: process.env.SMTP_SECURE === 'true',
  auth: {
    user: process.env.BREVO_SMTP_USER,
    pass: process.env.BREVO_SMTP_PASS,
  },
} as any);

export const sendResetPasswordEmail = async (
  to: string,
  resetLink: string,
): Promise<void> => {
  const mailOptions = {
    from: process.env.DEFAULT_FROM_EMAIL,
    to,
    subject: "Password Reset Request",
    html: resetPasswordTemplate(resetLink),
  };
  await transporter.sendMail(mailOptions);
};