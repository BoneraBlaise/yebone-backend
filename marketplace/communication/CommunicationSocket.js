class CommunicationSocket {
  constructor({ notificationService, messagingService } = {}) {
    this.notificationService = notificationService;
    this.messagingService = messagingService;
    this.io = null;
    this.userSockets = new Map();
  }

  attach(server) {
    const { Server } = require("socket.io");
    this.io = new Server(server, {
      cors: { origin: true, credentials: true },
      transports: ["websocket", "polling"],
    });

    this.io.on("connection", (socket) => {
      socket.on("addUser", (userId) => {
        if (!userId) return;
        this.userSockets.set(String(userId), socket.id);
        if (this.notificationService) {
          this.notificationService.setOnline(String(userId), socket.id);
        }
        this._broadcastOnlineUsers();
      });

      socket.on("sendMessage", async (data) => {
        try {
          const { senderId, receiverId, text, conversationId, images } = data || {};
          if (!conversationId || !senderId || !text) return;
          const message = await this.messagingService.sendMessage({
            conversationId,
            senderId,
            text,
            messageType: images?.url ? "image" : "text",
            images,
          });
          const payload = { senderId, text, conversationId, message, createdAt: message.createdAt || new Date() };
          const receiverSocket = this.userSockets.get(String(receiverId));
          if (receiverSocket) this.io.to(receiverSocket).emit("getMessage", payload);
          socket.emit("getMessage", payload);
        } catch (_error) {}
      });

      socket.on("updateLastMessage", (data) => {
        this.io.emit("lastMessage", data);
      });

      socket.on("disconnect", () => {
        for (const [userId, socketId] of this.userSockets.entries()) {
          if (socketId === socket.id) {
            this.userSockets.delete(userId);
            if (this.notificationService) this.notificationService.setOffline(userId);
          }
        }
        this._broadcastOnlineUsers();
      });
    });

    return this.io;
  }

  _broadcastOnlineUsers() {
    if (!this.io) return;
    this.io.emit("getUsers", [...this.userSockets.entries()].map(([userId, socketId]) => ({ userId, socketId })));
  }

  emitToUser(userId, event, payload) {
    const socketId = this.userSockets.get(String(userId));
    if (socketId && this.io) this.io.to(socketId).emit(event, payload);
  }
}

module.exports = CommunicationSocket;
