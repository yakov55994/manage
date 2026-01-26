import { useEffect, useState, useRef, useCallback } from "react";
import { io } from "socket.io-client";

// Remove /api from the URL to get the base server URL
const getSocketUrl = () => {
  const apiUrl = import.meta.env.VITE_API_URL;
  if (!apiUrl) return "http://localhost:3000";

  // Handle different URL formats
  try {
    const url = new URL(apiUrl);
    return url.origin; // Returns just protocol + host + port
  } catch {
    return apiUrl.replace(/\/api\/?$/, "") || "http://localhost:3000";
  }
};

const SOCKET_URL = getSocketUrl();

export const useSocket = () => {
  const [isConnected, setIsConnected] = useState(false);
  const socketRef = useRef(null);

  const connect = useCallback(() => {
    const token = localStorage.getItem("token");

    if (!token) {
      console.log("No token found, skipping socket connection");
      return;
    }

    if (socketRef.current?.connected) {
      return;
    }

    console.log("Connecting to socket:", SOCKET_URL);

    socketRef.current = io(SOCKET_URL, {
      auth: { token },
      transports: ["polling", "websocket"], // polling first for better compatibility
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
      timeout: 20000
    });

    socketRef.current.on("connect", () => {
      console.log("Socket connected");
      setIsConnected(true);
    });

    socketRef.current.on("disconnect", (reason) => {
      console.log("Socket disconnected:", reason);
      setIsConnected(false);
    });

    socketRef.current.on("connect_error", (error) => {
      console.error("Socket connection error:", error.message);
      setIsConnected(false);
    });
  }, []);

  const disconnect = useCallback(() => {
    if (socketRef.current) {
      socketRef.current.disconnect();
      socketRef.current = null;
      setIsConnected(false);
    }
  }, []);

  useEffect(() => {
    connect();

    return () => {
      disconnect();
    };
  }, [connect, disconnect]);

  // Listen for token changes (login/logout)
  useEffect(() => {
    const handleStorageChange = (e) => {
      if (e.key === "token") {
        if (e.newValue) {
          connect();
        } else {
          disconnect();
        }
      }
    };

    window.addEventListener("storage", handleStorageChange);
    return () => window.removeEventListener("storage", handleStorageChange);
  }, [connect, disconnect]);

  return {
    socket: socketRef.current,
    isConnected,
    connect,
    disconnect
  };
};

export default useSocket;
