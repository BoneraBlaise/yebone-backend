const Conversation = require("../../model/conversation");
const Messages = require("../../model/messages");
const { NOTIFICATION_TYPES } = require("./CommunicationDefaults");

class MessagingService {
  constructor({ inboxBridge, notificationService, socketEmitter } = {}) {
    this.inboxBridge = inboxBridge;
    this.notificationService = notificationService;
    this.socketEmitter = socketEmitter;
  }

  _error(message, statusCode = 400) {
    const error = new Error(message);
    error.statusCode = statusCode;
    return error;
  }

  _assertMember(conversation, userId) {
    const members = (conversation.members || []).map(String);
    if (!members.includes(String(userId))) throw this._error("Not a conversation member", 403);
  }

  async startProductConversation({ productId, buyerId, sellerId, productSnapshot, initialMessage }) {
    if (String(buyerId) === String(sellerId)) {
      throw this._error("Buyer and seller must be different", 400);
    }

    const conversation = await this.inboxBridge.findOrCreateProductConversation({
      productId,
      buyerId,
      sellerId,
      productSnapshot,
    });

    if (initialMessage) {
      await this.sendMessage({
        conversationId: String(conversation._id),
        senderId: buyerId,
        text: initialMessage,
        productSnapshot,
      });
    }

    return conversation;
  }

  async startListingConversation({ listingId, buyerId, sellerId, listingSnapshot, initialMessage }) {
    if (String(buyerId) === String(sellerId)) {
      throw this._error("Buyer and seller must be different", 400);
    }

    const conversation = await this.inboxBridge.findOrCreateListingConversation({
      listingId,
      buyerId,
      sellerId,
      listingSnapshot,
    });

    if (initialMessage) {
      await this.sendMessage({
        conversationId: String(conversation._id),
        senderId: buyerId,
        text: initialMessage,
        productSnapshot: listingSnapshot,
      });
    }

    return conversation;
  }

  async listConversations(userId, { search = "", includeArchived = false } = {}) {
    const query = { members: String(userId) };
    if (!includeArchived) {
      query.archivedBy = { $ne: String(userId) };
    }

    let conversations = await Conversation.find(query).sort({ updatedAt: -1 }).lean();

    if (search.trim()) {
      const term = search.trim().toLowerCase();
      conversations = conversations.filter((c) => {
        const title = c.productSnapshot?.name || c.groupTitle || "";
        const last = c.lastMessage || "";
        return title.toLowerCase().includes(term) || last.toLowerCase().includes(term);
      });
    }

    return conversations.map((c) => this._formatConversation(c, userId));
  }

  async listArchivedConversations(userId) {
    const conversations = await Conversation.find({
      members: String(userId),
      archivedBy: String(userId),
    })
      .sort({ updatedAt: -1 })
      .lean();
    return conversations.map((c) => this._formatConversation(c, userId));
  }

  _formatConversation(conversation, userId) {
    const unreadMap = conversation.unreadCounts || {};
    const unread =
      unreadMap instanceof Map
        ? Number(unreadMap.get(String(userId)) || 0)
        : Number(unreadMap[String(userId)] || 0);
    return { ...conversation, unreadCount: unread };
  }

  async getConversation(conversationId, userId) {
    const conversation = await Conversation.findById(conversationId).lean();
    if (!conversation) throw this._error("Conversation not found", 404);
    this._assertMember(conversation, userId);
    return this._formatConversation(conversation, userId);
  }

  async getMessages(conversationId, userId, { limit = 100, before } = {}) {
    const conversation = await Conversation.findById(conversationId).lean();
    if (!conversation) throw this._error("Conversation not found", 404);
    this._assertMember(conversation, userId);

    const query = { conversationId: String(conversationId) };
    if (before) query.createdAt = { $lt: new Date(before) };

    const messages = await Messages.find(query)
      .sort({ createdAt: -1 })
      .limit(Math.min(Math.max(1, Number(limit) || 100), 200))
      .lean();

    await this.markConversationRead(conversationId, userId);
    return messages.reverse();
  }

  async sendMessage({ conversationId, senderId, text, messageType = "text", images, productSnapshot }) {
    const conversation = await Conversation.findById(conversationId).lean();
    if (!conversation) throw this._error("Conversation not found", 404);
    this._assertMember(conversation, senderId);

    const normalizedText = String(text || "").trim();
    if (!normalizedText && !images?.url) {
      throw this._error("Message text or image is required");
    }

    const message = await this.inboxBridge.sendMessage({
      conversationId: String(conversationId),
      senderId,
      text: normalizedText,
      messageType,
      images,
      productSnapshot,
    });

    const recipientId = (conversation.members || [])
      .map(String)
      .find((id) => id !== String(senderId));

    if (recipientId && this.notificationService) {
      const isSellerRecipient = String(recipientId) === String(conversation.sellerId);
      const inboxPath = isSellerRecipient ? "/dashboard-messages" : "/inbox";
      await this.notificationService.notifyUser(String(recipientId), {
        type: NOTIFICATION_TYPES.NEW_MESSAGE,
        title: "New message",
        body: (normalizedText || "New image").slice(0, 120),
        link: `${inboxPath}?conversation=${conversationId}`,
        payload: { conversationId: String(conversationId), messageId: String(message._id) },
        sourceId: String(message._id),
      });
    }

    if (recipientId && this.socketEmitter) {
      this.socketEmitter.emitToUser(String(recipientId), "getMessage", {
        senderId,
        text: normalizedText,
        conversationId: String(conversationId),
        message,
        createdAt: message.createdAt || new Date(),
      });
    }

    return message;
  }

  async markConversationRead(conversationId, userId) {
    const conversation = await Conversation.findById(conversationId);
    if (!conversation) return;
    this._assertMember(conversation, userId);

    const unread = conversation.unreadCounts || new Map();
    unread.set(String(userId), 0);
    conversation.unreadCounts = unread;
    await conversation.save();

    await Messages.updateMany(
      { conversationId: String(conversationId), readBy: { $ne: String(userId) } },
      { $addToSet: { readBy: String(userId) } }
    );

    if (this.socketEmitter) {
      const otherMembers = (conversation.members || [])
        .map(String)
        .filter((id) => id !== String(userId));
      for (const memberId of otherMembers) {
        this.socketEmitter.emitToUser(memberId, "conversationRead", {
          conversationId: String(conversationId),
          readBy: String(userId),
        });
      }
    }
  }

  async archiveConversation(conversationId, userId) {
    const conversation = await Conversation.findById(conversationId);
    if (!conversation) throw this._error("Conversation not found", 404);
    this._assertMember(conversation, userId);

    const archived = new Set(conversation.archivedBy || []);
    archived.add(String(userId));
    conversation.archivedBy = [...archived];
    await conversation.save();
    return conversation.toObject();
  }

  async unarchiveConversation(conversationId, userId) {
    const conversation = await Conversation.findById(conversationId);
    if (!conversation) throw this._error("Conversation not found", 404);
    this._assertMember(conversation, userId);

    conversation.archivedBy = (conversation.archivedBy || []).filter((id) => id !== String(userId));
    await conversation.save();
    return conversation.toObject();
  }

  async getUnreadCount(userId) {
    const conversations = await Conversation.find({
      members: String(userId),
      archivedBy: { $ne: String(userId) },
    }).lean();

    return conversations.reduce((sum, c) => {
      const unreadMap = c.unreadCounts || {};
      const count =
        unreadMap instanceof Map
          ? Number(unreadMap.get(String(userId)) || 0)
          : Number(unreadMap[String(userId)] || 0);
      return sum + count;
    }, 0);
  }
}

module.exports = MessagingService;
