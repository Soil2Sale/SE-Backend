export const resetPasswordTemplate = (resetLink: string): string => {
  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Reset Password</title>
    </head>
    <body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f4f4f4;">
      <table role="presentation" style="width: 100%; border-collapse: collapse;">
        <tr>
          <td align="center" style="padding: 40px 0;">
            <table role="presentation" style="width: 600px; border-collapse: collapse; background-color: #ffffff; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
              <tr>
                <td style="padding: 40px 30px;">
                  <h1 style="margin: 0 0 20px 0; color: #333333; font-size: 24px; font-weight: bold;">Reset Your Password</h1>
                  <p style="margin: 0 0 20px 0; color: #666666; font-size: 16px; line-height: 1.5;">
                    We received a request to reset your password. Click the button below to create a new password.
                  </p>
                  <table role="presentation" style="margin: 30px 0;">
                    <tr>
                      <td align="center">
                        <a href="${resetLink}" style="background-color: #007bff; color: #ffffff; padding: 14px 40px; text-decoration: none; border-radius: 4px; font-size: 16px; font-weight: bold; display: inline-block;">Reset Password</a>
                      </td>
                    </tr>
                  </table>
                  <p style="margin: 0 0 10px 0; color: #666666; font-size: 14px; line-height: 1.5;">
                    Or copy and paste this link into your browser:
                  </p>
                  <p style="margin: 0 0 20px 0; color: #007bff; font-size: 14px; word-break: break-all;">
                    ${resetLink}
                  </p>
                  <p style="margin: 0 0 10px 0; color: #666666; font-size: 14px; line-height: 1.5;">
                    This link will expire in 30 minutes.
                  </p>
                  <p style="margin: 0; color: #999999; font-size: 14px; line-height: 1.5;">
                    If you didn't request a password reset, please ignore this email or contact support if you have concerns.
                  </p>
                </td>
              </tr>
              <tr>
                <td style="padding: 20px 30px; background-color: #f8f9fa; border-radius: 0 0 8px 8px;">
                  <p style="margin: 0; color: #999999; font-size: 12px; text-align: center;">
                    This is an automated email. Please do not reply to this message.
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
