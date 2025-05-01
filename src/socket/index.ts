import { Server } from "socket.io";
import { AvailableChatEvents, chatEventEnum } from "../constants";
import cookie from "cookie";
import { ApiError } from "../utils/ApiError";
import jwt from "jsonwebtoken";
import { User } from "../models/user.model";
import { TokenPayload } from "../types/token.types";
import { CustomSocket } from "../types/socket.types";
import { addSocket, broadcastToUser, removeSocket } from "./socket_manager";
import { Request } from "express";

const initializeSocketIO = (io: Server) => {
  return io.on("connection", async (socket: CustomSocket) => {
    try {
      // Get token from headers or cookies
      let token =
        socket.handshake.auth?.token ||
        (socket.handshake.headers?.cookie
          ? cookie.parse(socket.handshake.headers.cookie).accessToken
          : null);

      if (!token) {
        throw new ApiError(401, "No authentication token provided");
      }

      // Verify the token
      const decodedToken = jwt.verify(
        token,
        process.env.ACCESS_TOKEN_SECRET!
      ) as TokenPayload;

      // Find the user
      const user = await User.findById(decodedToken._id).select(
        "-refreshToken"
      );

      if (!user) {
        throw new ApiError(401, "Unauthorized: User not found");
      }

      // Add user to socket instance
      socket.user = user;

      // Track the socket in our socket manager
      addSocket(user._id.toString(), socket.id);

      // Also join the socket to a room with the user's ID
      socket.join(user._id.toString());
      console.log(
        `User ${user._id.toString()} joined room ${user._id.toString()}`
      );

      // Listen for private messages
      socket.on(chatEventEnum.PRIVATE_MESSAGE_EVENT, (data) => {
        const parsedData: { message: string; id: string } = JSON.parse(data);
        console.log("data:", parsedData);

        const fromUserId = user._id.toString();
        const toUserId = parsedData.id;

        const messagePayload = {
          id: fromUserId,
          message: parsedData.message,
        };

        // Use broadcastToUser for direct targeting
        broadcastToUser(
          io,
          toUserId,
          chatEventEnum.PRIVATE_MESSAGE_EVENT,
          messagePayload
        );

        // Also send to sender
        broadcastToUser(
          io,
          fromUserId,
          chatEventEnum.PRIVATE_MESSAGE_EVENT,
          messagePayload
        );
      });

      // Clean up on disconnect
      socket.on("disconnect", () => {
        console.log("Client disconnected", socket.id);
        removeSocket(user._id.toString(), socket.id);
        socket.leave(user._id.toString());
      });
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error
          ? error.message
          : "Something went wrong while connecting to the socket";
      socket.emit(chatEventEnum.SOCKET_ERROR_EVENT, errorMessage);
    }
  });
};

/**
 * Emit an event to a specific user
 */
const emitSocketEvent = (
  req: Request,
  userId: string,
  event: string,
  payload: any
) => {
  console.log(`Attempting to emit ${event} to user ${userId}`);

  // Get socket.io instance
  const io = req.app.get("io");

  // Use our broadcastToUser function instead
  broadcastToUser(io, userId, event, payload);
};

export { initializeSocketIO, emitSocketEvent };
