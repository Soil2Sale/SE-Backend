export const otpEmailTemplate = (otp: string): string => {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>OTP Verification</title>
    </head>
    <body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f4f4f4;">
      <table role="presentation" style="width: 100%; border-collapse: collapse;">
        <tr>
          <td align="center" style="padding: 40px 0;">
            <table role="presentation" style="width: 600px; border-collapse: collapse; background-color: #ffffff; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
              <tr>
                <td style="padding: 40px 30px; text-align: center; background-color: #4CAF50;">
                  <h1 style="margin: 0; color: #ffffff; font-size: 28px;">AgriConnect</h1>
                </td>
              </tr>
              <tr>
                <td style="padding: 40px 30px;">
                  <h2 style="margin: 0 0 20px 0; color: #333333; font-size: 24px;">OTP Verification</h2>
                  <p style="margin: 0 0 20px 0; color: #666666; font-size: 16px; line-height: 24px;">
                    Your One-Time Password (OTP) for AgriConnect is:
                  </p>
                  <div style="background-color: #f8f8f8; border: 2px dashed #4CAF50; border-radius: 8px; padding: 20px; text-align: center; margin: 30px 0;">
                    <p style="margin: 0; font-size: 36px; font-weight: bold; color: #4CAF50; letter-spacing: 8px;">${otp}</p>
                  </div>
                  <p style="margin: 0 0 10px 0; color: #666666; font-size: 14px; line-height: 20px;">
                    This OTP is valid for <strong>5 minutes</strong>.
                  </p>
                  <p style="margin: 0 0 20px 0; color: #666666; font-size: 14px; line-height: 20px;">
                    If you didn't request this OTP, please ignore this email.
                  </p>
                </td>
              </tr>
              <tr>
                <td style="padding: 30px; background-color: #f8f8f8; text-align: center;">
                  <p style="margin: 0; color: #999999; font-size: 12px;">
                    © 2026 AgriConnect. All rights reserved.
                  </p>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    </body>
    </html>
  `;
};
