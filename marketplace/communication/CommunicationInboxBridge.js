const Conversation = require("../../model/conversation");
const Messages = require("../../model/messages");

class CommunicationInboxBridge {
  buildGroupTitle(productId, buyerId) {
    return `product-${productId}-${buyerId}`;
  }

  async findOrCreateProductConversation({ productId, buyerId, sellerId, productSnapshot }) {
    const groupTitle = this.buildGroupTitle(productId, buyerId);
    let conversation = await Conversation.findOne({ groupTitle });
    if (!conversation) {
      conversation = await Conversation.create({
        groupTitle,
        members: [buyerId, sellerId],
        productId: String(productId),
        sellerId: String(sellerId),
        buyerId: String(buyerId),
        contextType: "product",
        productSnapshot: productSnapshot || null,
        unreadCounts: new Map([
          [String(buyerId), 0],
          [String(sellerId), 0],
        ]),
      });
    } else if (productSnapshot && !conversation.productSnapshot) {
      conversation.productSnapshot = productSnapshot;
      await conversation.save();
    }
    return conversation.toObject ? conversation.toObject() : conversation;
  }

  async sendMessage({
    conversationId,
    senderId,
    text,
    messageType = "text",
    offerId = null,
    productSnapshot = null,
    images = undefined,
  }) {
    const message = await Messages.create({
      conversationId,
      sender: senderId,
      text,
      messageType,
      offerId,
      productSnapshot,
      images,
      readBy: [String(senderId)],
    });

    const conversation = await Conversation.findById(conversationId);
    if (conversation) {
      conversation.lastMessage = text;
      conversation.lastMessageId = String(message._id);
      const members = (conversation.members || []).map(String);
      const unread = conversation.unreadCounts || new Map();
      for (const memberId of members) {
        if (memberId === String(senderId)) {
          unread.set(memberId, 0);
        } else {
          unread.set(memberId, Number(unread.get(memberId) || 0) + 1);
        }
      }
      conversation.unreadCounts = unread;
      conversation.archivedBy = (conversation.archivedBy || []).filter(
        (id) => id !== String(senderId)
      );
      await conversation.save();
    }

    return message.toObject ? message.toObject() : message;
  }

  formatOfferMessage(offer) {
    return `[Offer] ${offer.amount} ${offer.currency || "RWF"}${offer.message ? ` — ${offer.message}` : ""}`;
  }
}

module.exports = CommunicationInboxBridge;
