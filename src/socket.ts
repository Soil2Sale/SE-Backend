import { Server as HttpServer } from "http";
import { Server, Socket } from "socket.io";
import { verifyAccessToken } from "./utils/jwt";
import Message, { buildConversationId } from "./models/Message";
import Notification from "./models/Notification";

let io: Server;

export function initSocket(httpServer: HttpServer): Server {
  io = new Server(httpServer, {
    cors: {
      origin: process.env.CLIENT_URL,
      credentials: true,
    },
  });

  io.use((socket: Socket, next) => {
    const token =
      socket.handshake.auth?.token ||
      socket.handshake.headers?.authorization?.split(" ")[1];

    if (!token) {
      return next(new Error("Authentication required"));
    }

    try {
      const decoded = verifyAccessToken(token);
      (socket as any).user = decoded;
      next();
    } catch {
      next(new Error("Invalid or expired token"));
    }
  });

  io.on("connection", (socket: Socket) => {
    const user = (socket as any).user as {
      userId: string;
      email: string;
      role: string;
    };

    socket.join(`user:${user.userId}`);

    socket.on("chat:join", (conversationId: string) => {
      socket.join(`chat:${conversationId}`);
    });

    socket.on(
      "chat:message",
      async (data: { receiver_id: string; content: string }) => {
        const { receiver_id, content } = data;

        if (!receiver_id || !content?.trim()) {
          socket.emit("error", { message: "receiver_id and content required" });
          return;
        }

        const conversation_id = buildConversationId(user.userId, receiver_id);

        const message = await Message.create({
          conversation_id,
          sender_id: user.userId,
          receiver_id,
          content: content.trim(),
        });

        const payload = {
          id: message.id,
          conversation_id: message.conversation_id,
          sender_id: message.sender_id,
          receiver_id: message.receiver_id,
          content: message.content,
          created_at: message.created_at,
        };

        io.to(`chat:${conversation_id}`).emit("chat:message", payload);
        io.to(`user:${receiver_id}`).emit("chat:message", payload);
      },
    );

    socket.on("chat:read", async (data: { conversation_id: string }) => {
      const { conversation_id } = data;
      await Message.updateMany(
        {
          conversation_id,
          receiver_id: user.userId,
          read_at: { $exists: false },
        },
        { $set: { read_at: new Date() } },
      );
      socket.to(`chat:${conversation_id}`).emit("chat:read", {
        conversation_id,
        read_by: user.userId,
      });
    });

    socket.on("disconnect", () => {});
  });

  return io;
}

export function getIO(): Server {
  if (!io) throw new Error("Socket.io not initialized");
  return io;
}

export function emitNotification(
  userId: string,
  notification: object,
): void {
  getIO().to(`user:${userId}`).emit("notification:new", notification);
}
