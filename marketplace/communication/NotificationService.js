const Notification = require("../../model/notification");

class NotificationService {
  constructor({ pushService, socketEmitter } = {}) {
    this.pushService = pushService;
    this.socketEmitter = socketEmitter;
    this.onlineUsers = new Map();
  }

  setOnline(userId, socketId) {
    this.onlineUsers.set(String(userId), socketId);
  }

  setOffline(userId) {
    this.onlineUsers.delete(String(userId));
  }

  isOnline(userId) {
    return this.onlineUsers.has(String(userId));
  }

  async createNotification(recipientId, data = {}) {
    const notification = await Notification.create({
      recipientId: String(recipientId),
      recipientType: data.recipientType || "user",
      type: data.type,
      title: data.title,
      body: data.body || "",
      payload: data.payload || {},
      link: data.link || null,
      sourceModule: data.sourceModule || "communication",
      sourceId: data.sourceId || null,
    });

    return notification.toObject();
  }

  async notifyUser(recipientId, data = {}) {
    const notification = await this.createNotification(recipientId, data);

    if (this.isOnline(recipientId) && this.socketEmitter) {
      this.socketEmitter.emitToUser(String(recipientId), "notification", notification);
    } else if (this.pushService) {
      await this.pushService.sendToUser(String(recipientId), {
        title: notification.title,
        body: notification.body,
        link: notification.link,
        data: { notificationId: String(notification._id), type: notification.type },
      });
    }

    return notification;
  }

  async listNotifications(userId, { unreadOnly = false, limit = 50, page = 1 } = {}) {
    const query = { recipientId: String(userId) };
    if (unreadOnly) query.read = false;
    const skip = (Math.max(1, page) - 1) * limit;
    const [items, total, unreadCount] = await Promise.all([
      Notification.find(query).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
      Notification.countDocuments(query),
      Notification.countDocuments({ recipientId: String(userId), read: false }),
    ]);
    return { items, total, unreadCount, page, limit };
  }

  async markRead(notificationId, userId) {
    const notification = await Notification.findOneAndUpdate(
      { _id: notificationId, recipientId: String(userId) },
      { read: true, readAt: new Date() },
      { new: true }
    ).lean();
    if (!notification) {
      const error = new Error("Notification not found");
      error.statusCode = 404;
      throw error;
    }
    return notification;
  }

  async markAllRead(userId) {
    await Notification.updateMany(
      { recipientId: String(userId), read: false },
      { read: true, readAt: new Date() }
    );
    return { success: true };
  }

  async getUnreadCount(userId) {
    return Notification.countDocuments({ recipientId: String(userId), read: false });
  }
}

module.exports = NotificationService;
