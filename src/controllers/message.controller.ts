import mongoose from "mongoose";
import { Chat } from "../models/chat.model";
import { ChatMessage, IAttachment } from "../models/message.model";
import { ApiError } from "../utils/ApiError";
import { asyncHandler } from "../utils/asyncHandler";
import { ApiResponse } from "../utils/ApiResponse";
import {
  getAttachmentType,
  getLocalPath,
  getStaticFilePath,
} from "../utils/helpers";
import { emitSocketEvent } from "../socket";
import { chatEventEnum } from "../constants";

/**
 * @description Utility function which returns the pipeline stages to structure the chat message schema with common lookups
 * @returns {mongoose.PipelineStage[]}
 */

const chatMessageCommonAggreggation = () => {
  return [
    {
      $lookup: {
        from: "users",
        foreignField: "_id",
        localField: "sender",
        as: "sender",
        pipeline: [
          {
            $project: {
              username: 1,
              mobileNumber: 1,
              avatar: 1,
            },
          },
        ],
      },
    },
    {
      $addFields: {
        sender: { $first: "$sender" },
      },
    },
  ];
};

const getAllMessages = asyncHandler(async (req, res) => {
  const { chatId } = req.params;
  const selectedChat = await Chat.findById(chatId);
  if (!selectedChat) {
    throw new ApiError(404, "Chat does not exist");
  }

  if (!selectedChat.participants.includes(req.user?._id)) {
    throw new ApiError(400, "User is not part of this chat");
  }

  const messages = await ChatMessage.aggregate([
    {
      $match: {
        chat: new mongoose.Types.ObjectId(chatId),
      },
    },
    ...chatMessageCommonAggreggation(),
    {
      $sort: {
        createdAt: -1,
      },
    },
  ]);
  return res
    .status(200)
    .json(
      new ApiResponse(200, messages || [], "Messages fetched successfully")
    );
});

const sendMessage = asyncHandler(async (req, res) => {
  const { chatId } = req.params;
  const { content } = req.body;

  let attachments: Express.Multer.File[] = [];

  if (req.files && !Array.isArray(req.files)) {
    attachments = req.files.attachments ?? [];
  }

  if (!content && attachments.length === 0) {
    throw new ApiError(400, "message content or attachments is required");
  }

  const selectedChat = await Chat.findById(chatId);
  if (!selectedChat) {
    throw new ApiError(404, "Chat does not exist");
  }

  const messageFiles: IAttachment[] = [];
  attachments.forEach((attachment) => {
    messageFiles.push({
      url: getStaticFilePath(req, attachment.filename),
      localPath: getLocalPath(attachment.filename),
      type: getAttachmentType(attachment.mimetype),
      filename: attachment.originalname,
      mimeType: attachment.mimetype,
      size: attachment.size,
    });
  });

  const message = await ChatMessage.create({
    sender: new mongoose.Types.ObjectId(req.user._id as string),
    content: content || "",
    chat: new mongoose.Types.ObjectId(chatId),
    attachments: messageFiles,
  });

  const chat = await Chat.findByIdAndUpdate(
    chatId,
    {
      $set: {
        lastMessage: message._id,
      },
    },
    {
      new: true,
    }
  );

  // structure the message
  const messages = await ChatMessage.aggregate([
    {
      $match: {
        _id: new mongoose.Types.ObjectId(message._id as string),
      },
    },
    ...chatMessageCommonAggreggation(),
  ]);
  const receivedMessage = messages[0];
  if (!receivedMessage) {
    throw new ApiError(500, "internal server error");
  }
  chat?.participants.forEach((participantObjectId) => {
    if (participantObjectId.toString() === req.user._id.toString()) return;
    // emit the receive message event to the other participants with received message as the payload
    emitSocketEvent(
      req,
      participantObjectId.toString(),
      chatEventEnum.MESSAGE_RECEIVED_EVENT,
      receivedMessage
    );
  });
  return res
    .status(200)
    .json(new ApiResponse(200, receivedMessage, "Message saved succesfully"));
});

export { getAllMessages, sendMessage };
