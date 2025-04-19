import { Server, Socket } from "socket.io";

const connectedUsers = new Map<string, Set<string>>();

export const addSocket = (userId: string, socketId: string) => {
  if (!connectedUsers.has(userId)) {
    connectedUsers.set(userId, new Set());
  }

  connectedUsers.get(userId)?.add(socketId);
};

export const removeSocket = (userId: string, socketId: string) => {
  if (connectedUsers.has(userId)) {
    const sockets = connectedUsers.get(userId)!;
    sockets.delete(socketId);

    if (sockets.size === 0) {
      connectedUsers.delete(userId);
    }
  }
};

// Broadcast to all sockets of a user

export const broadcastToUser = (
  io: Server,
  userId: string,
  event: string,
  data: any
) => {
  const recipientSocketIds = connectedUsers.get(userId);
  if (recipientSocketIds) {
    recipientSocketIds.forEach((socketId) => {
      io.to(socketId).emit(event, data);
    });
  }
};
