import { Request, Response, NextFunction } from "express";
import User from "../models/User";

export const linkTelegram = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { user_id, chat_id } = req.body;

    const user = await User.findOne({ id: user_id });

    if (!user) {
      res.status(404).json({
        success: false,
        message: "User not found"
      });
      return;
    }

    user.telegram_chat_id = chat_id;
    user.is_telegram_linked = true;
    await user.save();

    res.status(200).json({
      success: true,
      message: "Telegram linked successfully"
    });
  } catch (error) {
    next(error);
  }
};

export const unlinkTelegram = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { userId } = req.params;

    const user = await User.findOne({ id: userId });

    if (!user) {
      res.status(404).json({
        success: false,
        message: "User not found"
      });
      return;
    }

    user.telegram_chat_id = undefined;
    user.is_telegram_linked = false;
    await user.save();

    res.status(200).json({
      success: true,
      message: "Telegram unlinked successfully"
    });
  } catch (error) {
    next(error);
  }
};

export const getTelegramStatus = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { userId } = req.params;

    const user = await User.findOne({ id: userId });

    if (!user) {
      res.status(404).json({
        success: false,
        message: "User not found"
      });
      return;
    }

    res.status(200).json({
      success: true,
      data: {
        is_telegram_linked: user.is_telegram_linked,
        telegram_bot_link: `https://t.me/${process.env.TELEGRAM_BOT_USERNAME}?start=${user.id}`
      }
    });
  } catch (error) {
    next(error);
  }
};
