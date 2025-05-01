import mongoose from "mongoose";
import { Chat } from "../models/chat.model";
import { User } from "../models/user.model";
import { ApiError } from "../utils/ApiError";
import { ApiResponse } from "../utils/ApiResponse";
import { asyncHandler } from "../utils/asyncHandler";
import { emitSocketEvent } from "../socket";
import { chatEventEnum } from "../constants";


const chatCommonAggregation = () => {
  return [
    {
      // Lookup for participants (users)
      $lookup: {
        from: "users",
        foreignField: "_id",
        localField: "participants",
        as: "participants",
        pipeline: [
          {
            $project: {
              username: 1,
              mobileNumber: 1,
              avatar: 1,
              // Exclude refreshToken and other sensitive fields
            },
          },
        ],
      },
    },
    {
      // Lookup for the last message
      $lookup: {
        from: "chatmessages",
        foreignField: "_id",
        localField: "lastMessage",
        as: "lastMessage",
        pipeline: [
          {
            // Get sender details
            $lookup: {
              from: "users",
              foreignField: "_id",
              localField: "sender",
              as: "sender",
              pipeline: [
                {
                  $project: {
                    username: 1,
                    avatar: 1,
                    mobileNumber: 1,
                  },
                },
              ],
            },
          },
          {
            // Convert sender array to object
            $addFields: {
              sender: { $first: "$sender" },
            },
          },
          {
            // Project only necessary fields from the message
            $project: {
              content: 1,
              attachments: 1,
              chat: 1,
              readBy: 1,
              createdAt: 1,
              updatedAt: 1,
              sender: 1,
              // Include other fields you need
            },
          },
        ],
      },
    },
    {
      // Convert lastMessage array to object
      $addFields: {
        lastMessage: { $first: "$lastMessage" },
      },
    },
    {
      // Add a virtual isRead field if needed
      $addFields: {
        "lastMessage.isRead": {
          $cond: {
            if: { $isArray: "$lastMessage.readBy" },
            then: {
              $in: ["$lastMessage.sender._id", "$lastMessage.readBy"],
            },
            else: false,
          },
        },
      },
    },
  ];
};

const createOrGetAOneOnOneChat = asyncHandler(async (req, res) => {
  const { receiverId } = req.params;
  console.log({ receiverId });
  if (!mongoose.Types.ObjectId.isValid(receiverId)) {
    throw new ApiError(400, "Invalid receiver ID format");
  }
  const receiver = await User.findById(receiverId);
  console.log({ receiver });
  if (!receiver) {
    throw new ApiError(404, "user doesn not exist");
  }

  if (receiver._id.toString() === req.user._id.toString()) {
    throw new ApiError(400, "You can't chat with yourself");
  }

  const chat = await Chat.aggregate([
    {
      $match: {
        isGroupChat: false,
        $and: [
          {
            participants: { $elemMatch: { $eq: req.user._id } },
          },
          {
            participants: { $elemMatch: { $eq: receiver._id } },
          },
        ],
      },
    },
    ...chatCommonAggregation(),
  ]);

  if (chat.length) {
    return res
      .status(200)
      .json(new ApiResponse(200, chat[0], "Chat retreived succesfully"));
  }

  const newChatInstance = await Chat.create({
    name: "new one on chat",
    participants: [req.user._id, receiver._id],
    admin: req.user._id,
  });

  const createdChat = await Chat.aggregate([
    {
      $match: {
        _id: newChatInstance._id,
      },
    },
    ...chatCommonAggregation(),
  ]);

  const payload = createdChat[0];
  if (!payload) {
    throw new ApiError(500, "Internal server error");
  }
  payload?.participants.forEach((participant: { _id: string }) => {
    console.log("inside the paricticpants");
    if (participant._id.toString() === req.user._id.toString()) return;
    emitSocketEvent(
      req,
      participant._id?.toString(),
      chatEventEnum.NEW_CHAT_EVENT,
      payload
    );
  });

  return res
    .status(201)
    .json(new ApiResponse(201, payload, "Chat created successfully"));
});

export { createOrGetAOneOnOneChat };
