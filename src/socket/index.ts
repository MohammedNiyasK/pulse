import { Server, Socket } from "socket.io";
import { AvailableChatEvents, chatEventEnum } from "../constants";
import cookie from "cookie";
import { ApiError } from "../utils/ApiError";
import jwt from "jsonwebtoken";
import { User } from "../models/user.model";
import { TokenPayload } from "../types/token.types";
import { CustomSocket } from "../types/socket.types";
import { addSocket, broadcastToUser, removeSocket } from "./socket_manager";

const initializeSocketIO = (io: Server) => {
  return io.on("connection", async (socket: CustomSocket) => {
    try {
      let token =
        socket.handshake.auth?.token ||
        (socket.handshake.headers?.cookie
          ? cookie.parse(socket.handshake.headers.cookie).accessToken
          : null);

      if (!token) {
        throw new ApiError(401, "No authentication token provided");
      }
      const decodedToken = jwt.verify(
        token,
        process.env.ACCESS_TOKEN_SECRET!
      ) as TokenPayload;

      const user = await User.findById(decodedToken._id).select(
        "-refreshToken"
      );
      if (!user) {
        throw new ApiError(401, "Unauthorized: User not found");
      }
      socket.user = user;

      addSocket(user._id.toString(), socket.id);

      socket.on(chatEventEnum.PRIVATE_MESSAGE_EVENT, (data) => {
        const parsedData: { message: string; id: string } = JSON.parse(data);
        console.log("data:", parsedData);

        const fromUserId = user._id.toString();
        const toUserId = parsedData.id;

        const messagePayload = {
          id: fromUserId,
          message: parsedData.message,
        };

        broadcastToUser(
          io,
          toUserId,
          chatEventEnum.PRIVATE_MESSAGE_EVENT,
          messagePayload
        );
        broadcastToUser(
          io,
          fromUserId,
          chatEventEnum.PRIVATE_MESSAGE_EVENT,
          messagePayload
        );
      });

      socket.on(chatEventEnum.DISCONNECTED_EVENT, () => {
        console.log("client disconnected", socket.id);
        removeSocket(user._id.toString(), socket.id);
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

export { initializeSocketIO };
