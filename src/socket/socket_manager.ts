import { Server } from "socket.io";

// This map tracks user IDs to their associated socket IDs
const userSocketMap: Record<string, Set<string>> = {};

/**
 * Add a socket connection for a user
 * @param userId The user's ID
 * @param socketId The socket ID to associate with this user
 */
const addSocket = (userId: string, socketId: string) => {
  if (!userSocketMap[userId]) {
    userSocketMap[userId] = new Set();
  }
  userSocketMap[userId].add(socketId);
  console.log(`Socket added for user ${userId}: ${socketId}`);
  console.log(
    "Current socket map:",
    Object.keys(userSocketMap).map(
      (key) => `${key}: ${Array.from(userSocketMap[key]).join(", ")}`
    )
  );
};

/**
 * Remove a socket connection for a user
 * @param userId The user's ID
 * @param socketId The socket ID to remove
 */
const removeSocket = (userId: string, socketId: string) => {
  if (userSocketMap[userId]) {
    userSocketMap[userId].delete(socketId);
    if (userSocketMap[userId].size === 0) {
      delete userSocketMap[userId];
    }
    console.log(`Socket removed for user ${userId}: ${socketId}`);
    console.log(
      "Current socket map:",
      Object.keys(userSocketMap).map(
        (key) => `${key}: ${Array.from(userSocketMap[key]).join(", ")}`
      )
    );
  }
};

/**
 * Get all socket IDs for a user
 * @param userId The user's ID
 * @returns Array of socket IDs
 */
const getUserSockets = (userId: string): string[] => {
  return userSocketMap[userId] ? Array.from(userSocketMap[userId]) : [];
};

/**
 * Broadcast an event to a specific user across all their connected sockets
 * @param io Socket.io server instance
 * @param userId The user's ID
 * @param event The event name
 * @param payload The data to send
 */
const broadcastToUser = (
  io: Server,
  userId: string,
  event: string,
  payload: any
) => {
  const userSockets = getUserSockets(userId);
  console.log(`Broadcasting to user ${userId}, sockets:`, userSockets);

  if (userSockets.length > 0) {
    userSockets.forEach((socketId) => {
      io.to(socketId).emit(event, payload);
      console.log(`Emitted event ${event} to socket ${socketId}`);
    });
  } else {
    console.log(`No sockets found for user ${userId}`);
  }
};

export { addSocket, removeSocket, getUserSockets, broadcastToUser };
