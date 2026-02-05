import axios, { AxiosError } from "axios";

interface TelegramResponse {
  ok: boolean;
  result?: unknown;
  description?: string;
}

export const sendOTPViaTelegram = async (
  chatId: string,
  otp: string
): Promise<void> => {
  try {
    await axios.post<TelegramResponse>(
      `https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/sendMessage`,
      {
        chat_id: chatId,
        text: `Your OTP is: ${otp}\n\nThis code will expire in 5 minutes.`,
        parse_mode: "Markdown"
      }
    );
  } catch (error) {
    const axiosError = error as AxiosError<TelegramResponse>;
    console.error("Telegram OTP error:", axiosError?.response?.data);
    throw new Error(axiosError?.response?.data?.description || "Failed to send OTP via Telegram");
  }
};
