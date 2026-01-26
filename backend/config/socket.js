import jwt from "jsonwebtoken";
import User from "../models/User.js";

let io = null;

/**
 * Initialize Socket.IO with the HTTP server
 */
export const initializeSocket = (socketIO) => {
  io = socketIO;

  // Authentication middleware
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth.token;

      if (!token) {
        return next(new Error("Authentication error: No token provided"));
      }

      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user = await User.findById(decoded.id).select("-password");

      if (!user || !user.isActive) {
        return next(new Error("Authentication error: User not found or inactive"));
      }

      // Attach user info to socket
      socket.userId = user._id.toString();
      socket.userRole = user.role;
      socket.userName = user.username;

      next();
    } catch (err) {
      console.error("Socket auth error:", err.message);
      next(new Error("Authentication error: Invalid token"));
    }
  });

  // Connection handler
  io.on("connection", (socket) => {
    console.log(`User connected: ${socket.userName} (${socket.userId})`);

    // Join user-specific room
    socket.join(`user:${socket.userId}`);

    // Join role-based room
    socket.join(`role:${socket.userRole}`);

    // Handle disconnection
    socket.on("disconnect", (reason) => {
      console.log(`User disconnected: ${socket.userName} - ${reason}`);
    });

    // Handle errors
    socket.on("error", (error) => {
      console.error(`Socket error for ${socket.userName}:`, error);
    });
  });

  console.log("Socket.IO initialized");
};

/**
 * Get the Socket.IO instance
 */
export const getIO = () => {
  if (!io) {
    throw new Error("Socket.IO not initialized");
  }
  return io;
};

/**
 * Emit event to a specific user
 */
export const emitToUser = (userId, event, data) => {
  if (io) {
    io.to(`user:${userId}`).emit(event, data);
  }
};

/**
 * Emit event to all admins
 */
export const emitToAdmins = (event, data) => {
  if (io) {
    io.to("role:admin").emit(event, data);
  }
};

/**
 * Emit event to all connected users
 */
export const emitToAll = (event, data) => {
  if (io) {
    io.emit(event, data);
  }
};

/**
 * Emit event to users with specific role
 */
export const emitToRole = (role, event, data) => {
  if (io) {
    io.to(`role:${role}`).emit(event, data);
  }
};

export default {
  initializeSocket,
  getIO,
  emitToUser,
  emitToAdmins,
  emitToAll,
  emitToRole
};
