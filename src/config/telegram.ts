import TelegramBot from "node-telegram-bot-api";
import User from "../models/User";

const token = process.env.TELEGRAM_BOT_TOKEN || "8124214977:AAF2GBygCFB_nGw6ssteozFnzRKyKf-0AaY";
console.log("Telegram Bot Token:", token); // Debugging line
const bot = new TelegramBot(token, { polling: true });

bot.onText(/\/start (.+)/, async (msg, match) => {
  const chatId = msg.chat.id;
  const userId = match?.[1];

  if (!userId) {
    bot.sendMessage(chatId, "Invalid link. Please use the link from the app.");
    return;
  }

  try {
    const user = await User.findOne({ id: userId });

    if (!user) {
      bot.sendMessage(chatId, "User not found. Please register first.");
      return;
    }

    user.telegram_chat_id = chatId.toString();
    user.is_telegram_linked = true;
    await user.save();

    bot.sendMessage(
      chatId,
      `✅ Telegram linked successfully!\n\nYour account (${user.mobile_number}) is now connected. You'll receive OTPs here.`
    );
  } catch (error) {
    console.error("Telegram link error:", error);
    bot.sendMessage(chatId, "Failed to link account. Please try again.");
  }
});

bot.on("message", (msg) => {
  const chatId = msg.chat.id;
  
  if (!msg.text?.startsWith("/start")) {
    bot.sendMessage(
      chatId,
      "Please use /start command with the link from the app to link your account."
    );
  }
});

export default bot;
