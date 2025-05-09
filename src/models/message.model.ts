import { model, Schema, Document, Types } from "mongoose";

type AttachmentType = "image" | "pdf" | "video" | "audio" | "other";

export interface IAttachment {
  url: string;
  localPath?: string;
  type: AttachmentType;
  filename: string;
  size?: number;
  mimeType?: string;
  thumbnail?: string; // For images/videos
  duration?: number; // For audio/video
  pages?: number; // For PDFs
}

interface IChatMessage extends Document {
  _id: Types.ObjectId;
  sender: Types.ObjectId;
  content?: string;
  attachments: IAttachment[];
  chat: Types.ObjectId;
  readBy: Types.ObjectId[];
  deletedFor: Types.ObjectId[];
  repliedTo?: Types.ObjectId;
  reactions: {
    userId: Types.ObjectId;
    emoji: string;
  }[];
  createdAt: Date;
  updatedAt: Date;
}

const chatMessageSchema = new Schema(
  {
    sender: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    content: {
      type: String,
    },
    attachments: {
      type: [
        {
          url: {
            type: String,
            required: true,
          },
          localPath: {
            type: String,
          },
          type: {
            type: String,
            required: true,
            enum: ["image", "pdf", "video", "audio", "other"],
          },
          filename: {
            type: String,
            required: true,
          },
          mimeType: {
            type: String,
          },
          thumbnail: {
            type: String, // URL to thumbnail for images/videos
          },
          duration: {
            type: Number, // in seconds for audio/video
          },
          pages: {
            type: Number, // for PDF documents
          },
        },
      ],
      default: [],
      validate: {
        validator: function (
          this: { content?: string },
          attachments: IAttachment[]
        ) {
          // Either content or at least one attachment must be present
          return this.content || attachments.length > 0;
        },
        message: "Message must have either content or at least one attachment",
      },
    },
    chat: {
      type: Schema.Types.ObjectId,
      ref: "Chat",
      required: true,
    },
    readBy: [
      {
        type: Schema.Types.ObjectId,
        ref: "User",
      },
    ],
    deletedFor: [
      {
        type: Schema.Types.ObjectId,
        ref: "User",
      },
    ],
    repliedTo: {
      type: Schema.Types.ObjectId,
      ref: "ChatMessage",
    },
    reactions: [
      {
        userId: {
          type: Schema.Types.ObjectId,
          ref: "User",
        },
        emoji: {
          type: String,
          required: true,
          maxLength: 5,
        },
      },
    ],
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

chatMessageSchema.virtual("isRead").get(function (
  this: IChatMessage,
  userId: Types.ObjectId
) {
  return this.readBy.includes(userId);
});

export const ChatMessage = model<IChatMessage>(
  "ChatMessage",
  chatMessageSchema
);
