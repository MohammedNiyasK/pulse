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
  removeLocalFile,
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
        _id: new mongoose.Types.ObjectId(message._id),
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

const deleteMessage = asyncHandler(async (req, res) => {
  const { chatId, messageId } = req.params;

  const chat = await Chat.findOne({
    _id: new mongoose.Types.ObjectId(chatId),
    participants: req.user?._id,
  });
  if (!chat) {
    throw new ApiError(404, "Chat does not exist");
  }

  const message = await ChatMessage.findOne({
    _id: new mongoose.Types.ObjectId(messageId),
  });
  if (!message) {
    throw new ApiError(404, "Message does not exist");
  }
  // check if the user is the sender of the message (only sender can delete the message)
  if (message.sender.toString() !== req.user._id.toString()) {
    throw new ApiError(
      403,
      "You are not authorized to delete the message , you are not the sender"
    );
  }
  if (message.attachments.length > 0) {
    // If the file has stored in server remove from the server
    message.attachments.forEach((attachment) => {
      if (attachment.localPath) removeLocalFile(attachment.localPath);
    });
  }

  await ChatMessage.deleteOne({ _id: new mongoose.Types.ObjectId(messageId) });

  if (
    chat?.lastMessage &&
    chat.lastMessage.toString() === message._id.toString()
  ) {
    const lastMessage = await ChatMessage.findOne(
      { chat: chatId, _id: { $ne: message._id } },
      {},
      { sort: { createdAt: -1 } }
    );

    await Chat.findByIdAndUpdate(chatId, {
      lastMessage: lastMessage ? lastMessage?._id : null,
    });
  }

  // Logic to emit socket event to the other participants
  chat.participants.forEach((participantObjectId) => {
    if (participantObjectId.toString() === req.user._id.toString()) return;
    emitSocketEvent(
      req,
      participantObjectId.toString(),
      chatEventEnum.MESSAGE_DELETE_EVENT,
      message
    );
  });
  return res
    .status(200)
    .json(new ApiResponse(200, message, "Message deleted succesfully"));
});

export { getAllMessages, sendMessage, deleteMessage };
