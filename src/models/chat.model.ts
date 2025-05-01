import { Schema, Document, Types, model } from "mongoose";

interface IChat extends Document {
  name: string;
  isGroupChat: boolean;
  lastMessage?: Types.ObjectId;
  participants: Types.ObjectId[];
  admin?: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
  avatar?: string;
  description?: string;
  pinnedMessages?: Types.ObjectId[];
  readBy: Types.ObjectId[];
  customPermissions?: {
    userId: Types.ObjectId;
    canSendMessages: boolean;
    canAddParticipants: boolean;
    canRemoveParticipants: boolean;
    canChangeGroupInfo: boolean;
  }[];
}

const chatSchema: Schema = new Schema(
  {
    name: {
      type: String,
    },
    isGroupChat: {
      type: Boolean,
      default: false,
    },
    lastMessage: {
      type: Schema.Types.ObjectId,
      ref: "ChatMessage",
    },
    participants: [
      {
        type: Schema.Types.ObjectId,
        ref: "User",
      },
    ],
    admin: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },
    avatar: {
      type: String,
      default: "",
    },
    description: {
      type: String,
      MaxLength: [500, "Description cannot exceed 500 characters"],
    },
    pinnedMessages: {
      type: Schema.Types.ObjectId,
      ref: "ChatMessage",
    },
    readBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },
    customPermissions: [
      {
        userId: {
          type: Schema.Types.ObjectId,
          ref: "User",
          required: true,
        },
        canSendMessages: {
          type: Boolean,
          default: true,
        },
        canAddParticipants: {
          type: Boolean,
          default: false,
        },
        canRemoveParticipants: {
          type: Boolean,
          default: false,
        },
        canChangeGroupInfo: {
          type: Boolean,
          default: false,
        },
      },
    ],
  },
  {
    timestamps: true,
  }
);

export const Chat = model<IChat>("Chat", chatSchema);
