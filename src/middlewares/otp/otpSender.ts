export const sendOTPViaSMS = async (
  mobileNumber: string,
  otp: string,
): Promise<void> => {
  console.log(`[SMS Placeholder] Sending OTP ${otp} to ${mobileNumber}`);
  // TODO: Integrate SMS service (Twilio, AWS SNS, MSG91, etc.)
  // Example for future implementation:
  // const smsClient = new SmsService();
  // await smsClient.send({
  //   to: mobileNumber,
  //   message: `Your AgriConnect OTP is: ${otp}. Valid for 5 minutes.`
  // });
};

export const sendOTPViaIVR = async (
  mobileNumber: string,
  otp: string,
): Promise<void> => {
  console.log(
    `[IVR Placeholder] Sending OTP ${otp} to ${mobileNumber} via voice call`,
  );
  // TODO: Integrate IVR service for voice OTP delivery
  // Useful for farmers in rural areas with low literacy
};
