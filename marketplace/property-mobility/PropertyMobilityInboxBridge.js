class PropertyMobilityInboxBridge {
  constructor({ useMemoryOnly = false, repository } = {}) {
    this.useMemoryOnly = useMemoryOnly;
    this.repository = repository;
  }

  async createConversation({ groupTitle, userId, ownerId }) {
    if (this.useMemoryOnly) {
      const conversationId = `conv_${groupTitle}`;
      return { _id: conversationId, groupTitle, members: [userId, ownerId] };
    }

    const Conversation = require("../../model/conversation");
    let conversation = await Conversation.findOne({ groupTitle });
    if (!conversation) {
      conversation = await Conversation.create({
        groupTitle,
        members: [userId, ownerId],
      });
    }
    return conversation.toObject ? conversation.toObject() : conversation;
  }

  async sendMessage({ conversationId, senderId, text }) {
    if (this.useMemoryOnly) {
      return this.repository.storeInboxMessage({
        conversationId,
        sender: senderId,
        text,
      });
    }

    const Messages = require("../../model/messages");
    const message = await Messages.create({
      conversationId,
      sender: senderId,
      text,
    });
    const Conversation = require("../../model/conversation");
    await Conversation.findByIdAndUpdate(conversationId, {
      lastMessage: text,
      lastMessageId: String(message._id),
    }).catch(() => {});
    return message.toObject ? message.toObject() : message;
  }

  formatOfferMessage(offer) {
    if (offer.type === "appointment") {
      return `[Property Mobility Appointment] ${offer.message || ""} ${offer.appointmentAt ? `@ ${offer.appointmentAt}` : ""}`;
    }
    if (offer.type === "offer") {
      return `[Property Mobility Offer] ${offer.amount} RWF — ${offer.message || ""}`;
    }
    return `[Property Mobility Contact] ${offer.message || ""}`;
  }
}

module.exports = PropertyMobilityInboxBridge;
