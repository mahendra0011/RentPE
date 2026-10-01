import { io } from "socket.io-client";
import { CONFIG } from "../config";
import { AuthService } from "./auth";

let socket = null;

export const SocketService = {
  async connect() {
    if (socket && socket.connected) return socket;

    const token = await AuthService.getToken();
    if (!token) return null;

    socket = io(CONFIG.SOCKET_URL, {
      auth: { token },
      transports: ["websocket"],
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 2000 });

    socket.on("connect", () => {
      console.log("[MobileSocket] Connected to server socket:", socket.id);
    });

    socket.on("connect_error", (err) => {
      console.warn("[MobileSocket] Connection error:", err.message);
    });

    return socket;
  },

  on(event, callback) {
    if (!socket) return;
    socket.on(event, callback);
  },

  off(event, callback) {
    if (!socket) return;
    socket.off(event, callback);
  },

  disconnect() {
    if (socket) {
      socket.disconnect();
      socket = null;
    }
  }
};
