const jwt = require("jsonwebtoken");

class CommunicationSocket {
  constructor({ notificationService } = {}) {
    this.notificationService = notificationService;
    this.io = null;
    this.userSockets = new Map();
  }

  attach(server) {
    const { Server } = require("socket.io");
    this.io = new Server(server, {
      cors: { origin: true, credentials: true },
      transports: ["websocket", "polling"],
    });

    this.io.use((socket, next) => {
      const token = socket.handshake.auth?.token;
      if (!token) {
        return next(new Error("Unauthorized"));
      }
      try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET_KEY);
        socket.data.userId = String(decoded.id);
        return next();
      } catch (_error) {
        return next(new Error("Unauthorized"));
      }
    });

    this.io.on("connection", (socket) => {
      const userId = socket.data.userId;
      if (!userId) {
        socket.disconnect(true);
        return;
      }

      if (!this.userSockets.has(userId)) {
        this.userSockets.set(userId, new Set());
      }
      this.userSockets.get(userId).add(socket.id);

      if (this.notificationService) {
        this.notificationService.setOnline(userId, socket.id);
      }
      this._broadcastOnlineUsers();

      socket.on("disconnect", () => {
        const sockets = this.userSockets.get(userId);
        if (sockets) {
          sockets.delete(socket.id);
          if (sockets.size === 0) {
            this.userSockets.delete(userId);
            if (this.notificationService) {
              this.notificationService.setOffline(userId);
            }
          }
        }
        this._broadcastOnlineUsers();
      });
    });

    return this.io;
  }

  _broadcastOnlineUsers() {
    if (!this.io) return;
    const users = [];
    for (const [userId, socketIds] of this.userSockets.entries()) {
      for (const socketId of socketIds) {
        users.push({ userId, socketId });
      }
    }
    this.io.emit("getUsers", users);
  }

  emitToUser(userId, event, payload) {
    const socketIds = this.userSockets.get(String(userId));
    if (!socketIds || !this.io) return;
    for (const socketId of socketIds) {
      this.io.to(socketId).emit(event, payload);
    }
  }
}

module.exports = CommunicationSocket;
