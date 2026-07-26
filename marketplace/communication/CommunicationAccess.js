const Product = require("../../model/product");
const Conversation = require("../../model/conversation");

class CommunicationAccess {
  static assertBuyer(req) {
    if (!req.user?._id) {
      const error = new Error("Buyer authentication required");
      error.statusCode = 403;
      throw error;
    }
    return String(req.user._id);
  }

  static assertCronSecret(req) {
    const secret = process.env.COMMUNICATION_CRON_SECRET;
    if (!secret) {
      const error = new Error("Cron endpoint not configured");
      error.statusCode = 503;
      throw error;
    }
    if (String(req.headers["x-cron-secret"] || "") !== secret) {
      const error = new Error("Unauthorized cron request");
      error.statusCode = 401;
      throw error;
    }
    return true;
  }

  static assertOfferParticipant(offer, userId) {
    const id = String(userId);
    if (String(offer.buyerId) !== id && String(offer.sellerId) !== id) {
      const error = new Error("Not authorized to view this offer");
      error.statusCode = 403;
      throw error;
    }
  }

  static async assertConversationMember(conversationId, userId) {
    const conversation = await Conversation.findById(conversationId).lean();
    if (!conversation) {
      const error = new Error("Conversation not found");
      error.statusCode = 404;
      throw error;
    }
    const members = (conversation.members || []).map(String);
    if (!members.includes(String(userId))) {
      const error = new Error("Not a conversation member");
      error.statusCode = 403;
      throw error;
    }
    return conversation;
  }

  static async validateProductSeller(productId, sellerId) {
    const product = await Product.findById(productId).lean();
    if (!product) {
      const error = new Error("Product not found");
      error.statusCode = 404;
      throw error;
    }
    if (String(product.shopId) !== String(sellerId)) {
      const error = new Error("Seller does not own this product");
      error.statusCode = 403;
      throw error;
    }
    return product;
  }

  static sanitizeMessageText(text = "") {
    const normalized = String(text).trim();
    if (!normalized) {
      const error = new Error("Message text is required");
      error.statusCode = 400;
      throw error;
    }
    const maxLen = Number(process.env.COMMUNICATION_MESSAGE_MAX_LENGTH || 4000);
    if (normalized.length > maxLen) {
      const error = new Error(`Message exceeds ${maxLen} characters`);
      error.statusCode = 400;
      throw error;
    }
    return normalized;
  }
}

module.exports = CommunicationAccess;
