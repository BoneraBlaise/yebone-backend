const crypto = require("crypto");
const CommunicationOffer = require("../../model/communicationOffer");
const Product = require("../../model/product");
const {
  DEFAULT_OFFER_EXPIRY_HOURS,
  NOTIFICATION_TYPES,
} = require("./CommunicationDefaults");

class CommunicationOfferService {
  constructor({ inboxBridge, notificationService } = {}) {
    this.inboxBridge = inboxBridge;
    this.notificationService = notificationService;
  }

  _error(message, statusCode = 400) {
    const error = new Error(message);
    error.statusCode = statusCode;
    return error;
  }

  _generateOfferId() {
    return `offer_${crypto.randomBytes(8).toString("hex")}`;
  }

  _generatePriceLockToken() {
    return crypto.randomBytes(24).toString("hex");
  }

  _resolveExpiry(payload = {}) {
    if (payload.expiresAt) return new Date(payload.expiresAt);
    const hours = Number(payload.expirationHours || DEFAULT_OFFER_EXPIRY_HOURS);
    return new Date(Date.now() + hours * 3_600_000);
  }

  async _loadProduct(productId) {
    const product = await Product.findById(productId).lean();
    if (!product) throw this._error("Product not found", 404);
    if (Number(product.stock) <= 0) throw this._error("Product out of stock", 409);
    return product;
  }

  _buildProductSnapshot(product) {
    return {
      productId: String(product._id),
      name: product.name,
      price: Number(product.discountPrice || product.originalPrice),
      image: product.images?.[0]?.url || product.images?.url || null,
      shopId: String(product.shopId),
    };
  }

  async createOffer(buyerId, payload = {}) {
    const { productId, amount, message = "", conversationId } = payload;
    if (!productId || !Number.isFinite(Number(amount)) || Number(amount) <= 0) {
      throw this._error("productId and valid amount are required");
    }

    const product = await this._loadProduct(productId);
    const sellerId = String(product.shopId);
    if (String(buyerId) === sellerId) {
      throw this._error("Seller cannot create an offer on their own product", 403);
    }
    const snapshot = payload.productSnapshot || this._buildProductSnapshot(product);

    let conversation;
    if (conversationId) {
      conversation = await this.inboxBridge.findOrCreateProductConversation({
        productId,
        buyerId,
        sellerId,
        productSnapshot: snapshot,
      });
    } else {
      conversation = await this.inboxBridge.findOrCreateProductConversation({
        productId,
        buyerId,
        sellerId,
        productSnapshot: snapshot,
      });
    }

    const offer = await CommunicationOffer.create({
      offerId: this._generateOfferId(),
      conversationId: String(conversation._id),
      productId: String(productId),
      buyerId: String(buyerId),
      sellerId,
      amount: Number(amount),
      currency: payload.currency || "RWF",
      message,
      status: "pending",
      expiresAt: this._resolveExpiry(payload),
      productSnapshot: snapshot,
    });

    const text = this.inboxBridge.formatOfferMessage(offer);
    await this.inboxBridge.sendMessage({
      conversationId: offer.conversationId,
      senderId: buyerId,
      text,
      messageType: "offer",
      offerId: offer.offerId,
      productSnapshot: snapshot,
    });

    await this._notifyRecipient(sellerId, {
      type: NOTIFICATION_TYPES.NEW_OFFER,
      title: "New offer received",
      body: `${snapshot.name}: ${amount} RWF`,
      link: `/inbox?conversation=${offer.conversationId}`,
      payload: { offerId: offer.offerId, conversationId: offer.conversationId },
      sourceId: offer.offerId,
    });

    return offer.toObject();
  }

  async counterOffer(userId, offerId, payload = {}) {
    const parent = await CommunicationOffer.findOne({ offerId });
    if (!parent) throw this._error("Offer not found", 404);

    const isSeller = String(parent.sellerId) === String(userId);
    const isBuyer = String(parent.buyerId) === String(userId);
    if (!isSeller && !isBuyer) throw this._error("Not authorized", 403);
    if (parent.status !== "pending") throw this._error("Offer is no longer pending");

    const amount = Number(payload.amount);
    if (!Number.isFinite(amount) || amount <= 0) throw this._error("Valid amount required");

    await CommunicationOffer.updateOne({ offerId }, { status: "countered" });

    const counter = await CommunicationOffer.create({
      offerId: this._generateOfferId(),
      conversationId: parent.conversationId,
      productId: parent.productId,
      buyerId: parent.buyerId,
      sellerId: parent.sellerId,
      amount,
      currency: parent.currency,
      message: payload.message || "",
      status: "pending",
      parentOfferId: parent.offerId,
      expiresAt: this._resolveExpiry(payload),
      productSnapshot: parent.productSnapshot,
    });

    const text = this.inboxBridge.formatOfferMessage(counter);
    await this.inboxBridge.sendMessage({
      conversationId: counter.conversationId,
      senderId: userId,
      text,
      messageType: "offer",
      offerId: counter.offerId,
      productSnapshot: counter.productSnapshot,
    });

    const recipientId = isSeller ? parent.buyerId : parent.sellerId;
    await this._notifyRecipient(recipientId, {
      type: NOTIFICATION_TYPES.OFFER_COUNTER,
      title: "Counter offer received",
      body: `${amount} RWF`,
      link: `/inbox?conversation=${counter.conversationId}`,
      payload: { offerId: counter.offerId },
      sourceId: counter.offerId,
    });

    return counter.toObject();
  }

  async respondToOffer(userId, offerId, status) {
    if (!["accepted", "rejected"].includes(status)) {
      throw this._error("Status must be accepted or rejected");
    }

    const offer = await CommunicationOffer.findOne({ offerId });
    if (!offer) throw this._error("Offer not found", 404);

    const isSeller = String(offer.sellerId) === String(userId);
    const isBuyer = String(offer.buyerId) === String(userId);
    if (status === "accepted" && !isSeller) throw this._error("Only seller can accept", 403);
    if (status === "rejected" && !isSeller && !isBuyer) throw this._error("Not authorized", 403);

    if (offer.status !== "pending") throw this._error("Offer is no longer pending");
    if (offer.expiresAt && new Date(offer.expiresAt).getTime() < Date.now()) {
      await CommunicationOffer.updateOne({ offerId }, { status: "expired" });
      throw this._error("Offer has expired");
    }

    const updates = { status };
    if (status === "accepted") {
      updates.priceLockToken = this._generatePriceLockToken();
    }
    await CommunicationOffer.updateOne({ offerId }, updates);
    const updated = await CommunicationOffer.findOne({ offerId }).lean();

    const systemText =
      status === "accepted"
        ? `[Offer Accepted] ${offer.amount} ${offer.currency} — proceed to checkout`
        : `[Offer Rejected] ${offer.amount} ${offer.currency}`;

    await this.inboxBridge.sendMessage({
      conversationId: offer.conversationId,
      senderId: userId,
      text: systemText,
      messageType: "system",
      offerId: offer.offerId,
      productSnapshot: offer.productSnapshot,
    });

    const recipientId = status === "accepted" ? offer.buyerId : isSeller ? offer.buyerId : offer.sellerId;
    const notifType =
      status === "accepted" ? NOTIFICATION_TYPES.OFFER_ACCEPTED : NOTIFICATION_TYPES.OFFER_REJECTED;
    const checkoutLink =
      status === "accepted"
        ? `/checkout?offerId=${offer.offerId}&token=${updates.priceLockToken}`
        : `/inbox?conversation=${offer.conversationId}`;

    await this._notifyRecipient(recipientId, {
      type: notifType,
      title: status === "accepted" ? "Offer accepted" : "Offer rejected",
      body: `${offer.productSnapshot?.name || "Product"}: ${offer.amount} RWF`,
      link: checkoutLink,
      payload: { offerId: offer.offerId, priceLockToken: updates.priceLockToken || null },
      sourceId: offer.offerId,
    });

    return updated;
  }

  async getOffer(offerId, userId) {
    const offer = await CommunicationOffer.findOne({ offerId }).lean();
    if (!offer) throw this._error("Offer not found", 404);
    if (userId) {
      const id = String(userId);
      if (String(offer.buyerId) !== id && String(offer.sellerId) !== id) {
        throw this._error("Not authorized", 403);
      }
    }
    return offer;
  }

  async validateAcceptedOffer(offerId, priceLockToken, buyerId) {
    const offer = await this.getOffer(offerId, buyerId);
    if (offer.status !== "accepted") throw this._error("Offer is not accepted");
    if (String(offer.buyerId) !== String(buyerId)) throw this._error("Not authorized", 403);
    if (!priceLockToken || offer.priceLockToken !== priceLockToken) {
      throw this._error("Invalid or expired price lock", 403);
    }
    if (offer.orderId) throw this._error("Offer already used for an order", 409);
    if (offer.expiresAt && new Date(offer.expiresAt).getTime() < Date.now()) {
      throw this._error("Offer price lock expired");
    }
    return offer;
  }

  async markOfferOrdered(offerId, orderId) {
    await CommunicationOffer.updateOne({ offerId }, { orderId: String(orderId) });
  }

  async listOfferHistory(conversationId, userId) {
    const Conversation = require("../../model/conversation");
    const conversation = await Conversation.findById(conversationId).lean();
    if (!conversation) throw this._error("Conversation not found", 404);
    const members = (conversation.members || []).map(String);
    if (!members.includes(String(userId))) {
      throw this._error("Not authorized", 403);
    }
    return CommunicationOffer.find({ conversationId }).sort({ createdAt: -1 }).lean();
  }

  async expireDueOffers() {
    const now = new Date();
    const pending = await CommunicationOffer.find({
      status: "pending",
      expiresAt: { $lte: now },
    });
    let expired = 0;
    for (const offer of pending) {
      await CommunicationOffer.updateOne({ offerId: offer.offerId }, { status: "expired" });
      await this.inboxBridge.sendMessage({
        conversationId: offer.conversationId,
        senderId: offer.sellerId,
        text: `[Offer Expired] ${offer.amount} ${offer.currency}`,
        messageType: "system",
        offerId: offer.offerId,
      });
      expired += 1;
    }
    return { expired };
  }

  async _notifyRecipient(recipientId, notification) {
    if (!this.notificationService) return;
    await this.notificationService.notifyUser(String(recipientId), notification);
  }
}

module.exports = CommunicationOfferService;
