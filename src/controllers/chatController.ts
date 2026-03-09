import { Request, Response, NextFunction } from "express";
import Message, { buildConversationId } from "../models/Message";

export const getConversations = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const userId = req.user!.userId;

    const conversations = await Message.aggregate([
      {
        $match: {
          $or: [{ sender_id: userId }, { receiver_id: userId }],
        },
      },
      { $sort: { created_at: -1 } },
      {
        $group: {
          _id: "$conversation_id",
          last_message: { $first: "$$ROOT" },
          unread_count: {
            $sum: {
              $cond: [
                {
                  $and: [
                    { $eq: ["$receiver_id", userId] },
                    { $not: { $ifNull: ["$read_at", false] } },
                  ],
                },
                1,
                0,
              ],
            },
          },
        },
      },
      { $sort: { "last_message.created_at": -1 } },
    ]);

    res.status(200).json({ success: true, data: conversations });
  } catch (error) {
    next(error);
  }
};

export const getMessages = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const userId = req.user!.userId;
    const { otherUserId } = req.params;
    const page = parseInt((req.query.page as string) || "1");
    const limit = parseInt((req.query.limit as string) || "50");
    const skip = (page - 1) * limit;

    const conversation_id = buildConversationId(userId, otherUserId);

    const messages = await Message.find({ conversation_id })
      .sort({ created_at: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    res
      .status(200)
      .json({ success: true, data: messages.reverse(), conversation_id });
  } catch (error) {
    next(error);
  }
};

export const markRead = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const userId = req.user!.userId;
    const { otherUserId } = req.params;
    const conversation_id = buildConversationId(userId, otherUserId);

    await Message.updateMany(
      {
        conversation_id,
        receiver_id: userId,
        read_at: { $exists: false },
      },
      { $set: { read_at: new Date() } },
    );

    res.status(200).json({ success: true, message: "Messages marked as read" });
  } catch (error) {
    next(error);
  }
};
