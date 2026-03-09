import mongoose, { Schema, Document } from "mongoose";
import { v4 as uuidv4 } from "uuid";

export interface IMessage extends Document {
  id: string;
  conversation_id: string;
  sender_id: string;
  receiver_id: string;
  content: string;
  created_at: Date;
  read_at?: Date;
}

const messageSchema = new Schema<IMessage>(
  {
    id: {
      type: String,
      default: () => uuidv4(),
      unique: true,
      required: true,
    },
    conversation_id: {
      type: String,
      required: true,
      index: true,
    },
    sender_id: {
      type: String,
      required: true,
    },
    receiver_id: {
      type: String,
      required: true,
    },
    content: {
      type: String,
      required: true,
      trim: true,
    },
    created_at: {
      type: Date,
      default: Date.now,
      required: true,
    },
    read_at: {
      type: Date,
    },
  },
  {
    timestamps: false,
    versionKey: false,
  },
);

messageSchema.index({ conversation_id: 1, created_at: 1 });
messageSchema.index({ sender_id: 1 });
messageSchema.index({ receiver_id: 1 });

export function buildConversationId(userA: string, userB: string): string {
  return [userA, userB].sort().join("_");
}

export default mongoose.model<IMessage>("Message", messageSchema);
