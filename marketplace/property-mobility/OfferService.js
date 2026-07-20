const { OFFER_TYPES, OFFER_STATUSES } = require("./PropertyMobilitySettingsDefaults");

class OfferService {
  constructor({ repository, inboxBridge, audit }) {
    this.repository = repository;
    this.inboxBridge = inboxBridge;
    this.audit = audit;
  }

  async createOffer(buyerId, payload = {}, meta = {}) {
    const listing = await this.repository.getListing(payload.listingId);
    if (!listing || listing.status !== "published") {
      const error = new Error("Listing not available");
      error.statusCode = 404;
      throw error;
    }

    const type = payload.type || "offer";
    if (!OFFER_TYPES.includes(type)) {
      const error = new Error(`Invalid offer type: ${type}`);
      error.statusCode = 400;
      throw error;
    }

    const expiresAt =
      payload.expiresAt || new Date(Date.now() + Number(payload.expirationHours || 72) * 3_600_000).toISOString();

    const groupTitle = `pm-${listing.listingId}-${buyerId}`;
    const conversation = await this.inboxBridge.createConversation({
      groupTitle,
      userId: buyerId,
      ownerId: listing.ownerId,
    });

    const offer = await this.repository.createOffer({
      listingId: listing.listingId,
      buyerId,
      ownerId: listing.ownerId,
      type,
      amount: payload.amount,
      message: payload.message,
      appointmentAt: payload.appointmentAt,
      expiresAt,
      conversationId: String(conversation._id || conversation.id || groupTitle),
    });

    const text = this.inboxBridge.formatOfferMessage(offer);
    await this.inboxBridge.sendMessage({
      conversationId: offer.conversationId,
      senderId: buyerId,
      text,
    });

    await this.audit.record({
      platform: "propertyMobility",
      resource: offer.offerId,
      action: "offer.created",
      actor: meta.actor || buyerId,
      newValue: offer,
    });

    return { offer, conversationId: offer.conversationId };
  }

  async respondToOffer(ownerId, offerId, status, meta = {}) {
    if (!["accepted", "rejected"].includes(status)) {
      const error = new Error("Status must be accepted or rejected");
      error.statusCode = 400;
      throw error;
    }

    const offer = await this.repository.getOffer(offerId);
    if (!offer || offer.ownerId !== String(ownerId)) {
      const error = new Error("Offer not found");
      error.statusCode = 404;
      throw error;
    }

    if (offer.status !== "pending") {
      const error = new Error("Offer is no longer pending");
      error.statusCode = 400;
      throw error;
    }

    if (offer.expiresAt && new Date(offer.expiresAt).getTime() < Date.now()) {
      await this.repository.updateOffer(offerId, { status: "expired" });
      const error = new Error("Offer has expired");
      error.statusCode = 400;
      throw error;
    }

    const updated = await this.repository.updateOffer(offerId, { status });
    await this.inboxBridge.sendMessage({
      conversationId: offer.conversationId,
      senderId: ownerId,
      text: `[Property Mobility] Offer ${status}.`,
    });

    await this.audit.record({
      platform: "propertyMobility",
      resource: offerId,
      action: `offer.${status}`,
      actor: meta.actor || ownerId,
      newValue: updated,
    });

    return updated;
  }

  async expireDueOffers() {
    const offers = await this.repository.listOffers({ status: "pending" });
    const now = Date.now();
    let expired = 0;
    for (const offer of offers) {
      if (offer.expiresAt && new Date(offer.expiresAt).getTime() <= now) {
        await this.repository.updateOffer(offer.offerId, { status: "expired" });
        expired += 1;
      }
    }
    return { expired };
  }

  async listOffersForOwner(ownerId) {
    return this.repository.listOffers({ ownerId });
  }
}

module.exports = OfferService;
