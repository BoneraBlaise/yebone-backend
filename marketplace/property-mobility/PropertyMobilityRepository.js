const crypto = require("crypto");

class PropertyMobilityRepository {
  constructor({ useMemoryOnly = false, ListingModel = null } = {}) {
    this.useMemoryOnly = useMemoryOnly;
    this.ListingModel = ListingModel;
    this.listings = new Map();
    this.agencies = new Map();
    this.verifications = new Map();
    this.promotions = new Map();
    this.offers = new Map();
    this.reports = new Map();
    this.inbox = new Map();
  }

  setListingModel(model) {
    this.ListingModel = model;
  }

  _usesMemoryForListings() {
    return this.useMemoryOnly || !this.ListingModel;
  }

  _normalizeListing(doc) {
    if (!doc) return null;
    const item = doc.toObject ? doc.toObject() : structuredClone(doc);
    if (item.createdAt instanceof Date) item.createdAt = item.createdAt.toISOString();
    if (item.updatedAt instanceof Date) item.updatedAt = item.updatedAt.toISOString();
    if (item.promotionExpiresAt instanceof Date) {
      item.promotionExpiresAt = item.promotionExpiresAt.toISOString();
    }
    return item;
  }

  _parsePriceFilter(value) {
    if (value == null || value === "") return null;
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }

  _filterListings(items, filters = {}) {
    const minPrice = this._parsePriceFilter(filters.minPrice);
    const maxPrice = this._parsePriceFilter(filters.maxPrice);

    return items
      .filter((item) => {
        if (filters.ownerId && item.ownerId !== String(filters.ownerId)) return false;
        if (filters.category && item.category !== filters.category) return false;
        if (filters.categories?.length && !filters.categories.includes(item.category)) return false;
        if (filters.status && item.status !== filters.status) return false;
        if (filters.publishedOnly && item.status !== "published") return false;
        if (filters.verifiedOnly && !item.verified) return false;
        if (filters.featuredOnly && !item.featured) return false;
        if (minPrice != null && Number(item.price) < minPrice) return false;
        if (maxPrice != null && Number(item.price) > maxPrice) return false;
        if (filters.location && item.location?.city !== filters.location && item.location?.address !== filters.location) {
          if (!String(item.location?.city || "").toLowerCase().includes(String(filters.location).toLowerCase())) {
            return false;
          }
        }
        if (filters.q) {
          const q = String(filters.q).toLowerCase();
          const hay = `${item.title} ${item.description}`.toLowerCase();
          if (!hay.includes(q)) return false;
        }
        return item.status !== "deleted";
      })
      .sort((a, b) => {
        if (filters.sort === "price_asc") return Number(a.price) - Number(b.price);
        if (filters.sort === "price_desc") return Number(b.price) - Number(a.price);
        return String(b.createdAt).localeCompare(String(a.createdAt));
      })
      .map((item) => structuredClone(item));
  }

  resetForTests() {
    this.listings.clear();
    this.agencies.clear();
    this.verifications.clear();
    this.promotions.clear();
    this.offers.clear();
    this.reports.clear();
    this.inbox.clear();
  }

  _id(prefix) {
    return `${prefix}_${Date.now()}_${crypto.randomBytes(3).toString("hex")}`;
  }

  async createListing(ownerId, payload) {
    const listing = {
      listingId: payload.listingId || this._id("pm"),
      ownerId: String(ownerId),
      agencyId: payload.agencyId || null,
      category: payload.category,
      status: payload.status || "draft",
      title: payload.title || "",
      description: payload.description || "",
      photos: payload.photos || [],
      videos: payload.videos || [],
      price: Number(payload.price || 0),
      location: payload.location || {},
      coordinates: payload.coordinates || {},
      amenities: payload.amenities || [],
      documents: payload.documents || [],
      ownerInfo: payload.ownerInfo || {},
      verified: Boolean(payload.verified),
      featured: Boolean(payload.featured),
      homepagePromoted: Boolean(payload.homepagePromoted),
      searchBoost: Boolean(payload.searchBoost),
      sponsored: Boolean(payload.sponsored),
      promotionExpiresAt: payload.promotionExpiresAt || null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    if (this._usesMemoryForListings()) {
      this.listings.set(listing.listingId, listing);
      return structuredClone(listing);
    }

    const doc = await this.ListingModel.create(listing);
    return this._normalizeListing(doc);
  }

  async getListing(listingId) {
    if (this._usesMemoryForListings()) {
      const item = this.listings.get(String(listingId));
      return item ? structuredClone(item) : null;
    }

    const doc = await this.ListingModel.findOne({ listingId: String(listingId) }).lean();
    return doc ? this._normalizeListing(doc) : null;
  }

  async updateListing(listingId, patch) {
    if (this._usesMemoryForListings()) {
      const existing = this.listings.get(String(listingId));
      if (!existing) return null;
      const updated = {
        ...existing,
        ...patch,
        listingId: existing.listingId,
        updatedAt: new Date().toISOString(),
      };
      this.listings.set(existing.listingId, updated);
      return structuredClone(updated);
    }

    const updated = await this.ListingModel.findOneAndUpdate(
      { listingId: String(listingId) },
      { $set: { ...patch, updatedAt: new Date().toISOString() } },
      { new: true }
    ).lean();
    return updated ? this._normalizeListing(updated) : null;
  }

  async listAllListings() {
    if (this._usesMemoryForListings()) {
      return [...this.listings.values()].map((item) => structuredClone(item));
    }
    const docs = await this.ListingModel.find({}).lean();
    return docs.map((doc) => this._normalizeListing(doc));
  }

  async updateListingOwnerId(listingId, newOwnerId) {
    return this.updateListing(listingId, { ownerId: String(newOwnerId) });
  }

  async listListings(filters = {}) {
    if (this._usesMemoryForListings()) {
      return this._filterListings([...this.listings.values()], filters);
    }

    const query = {};
    if (filters.ownerId) query.ownerId = String(filters.ownerId);
    if (filters.category) query.category = filters.category;
    if (filters.categories?.length) query.category = { $in: filters.categories };
    if (filters.status) query.status = filters.status;
    else query.status = { $ne: "deleted" };

    const sort =
      filters.sort === "price_asc"
        ? { price: 1 }
        : filters.sort === "price_desc"
          ? { price: -1 }
          : { createdAt: -1 };

    const docs = await this.ListingModel.find(query).sort(sort).lean();
    return this._filterListings(docs.map((doc) => this._normalizeListing(doc)), filters);
  }

  async createAgency(ownerId, payload) {
    const agency = {
      agencyId: payload.agencyId || this._id("agency"),
      ownerId: String(ownerId),
      type: payload.type,
      name: payload.name,
      profile: payload.profile || {},
      subscriptionStatus: payload.subscriptionStatus || "inactive",
      subscriptionExpiresAt: payload.subscriptionExpiresAt || null,
      unlimitedListings: Boolean(payload.unlimitedListings),
      maxListings: payload.maxListings ?? null,
      createdAt: new Date().toISOString(),
    };
    this.agencies.set(agency.agencyId, agency);
    return structuredClone(agency);
  }

  async getAgency(agencyId) {
    const item = this.agencies.get(String(agencyId));
    return item ? structuredClone(item) : null;
  }

  async listAgencies(ownerId) {
    return [...this.agencies.values()]
      .filter((item) => !ownerId || item.ownerId === String(ownerId))
      .map((item) => structuredClone(item));
  }

  async updateAgency(agencyId, patch) {
    const existing = this.agencies.get(String(agencyId));
    if (!existing) return null;
    const updated = { ...existing, ...patch, agencyId: existing.agencyId };
    this.agencies.set(existing.agencyId, updated);
    return structuredClone(updated);
  }

  async createVerification(ownerId, payload) {
    const record = {
      verificationId: payload.verificationId || this._id("ver"),
      ownerId: String(ownerId),
      listingId: payload.listingId || null,
      nationalIdVerified: Boolean(payload.nationalIdVerified),
      phoneVerified: Boolean(payload.phoneVerified),
      businessVerified: Boolean(payload.businessVerified),
      addressVerified: Boolean(payload.addressVerified),
      feeAmount: Number(payload.feeAmount || 0),
      expiresAt: payload.expiresAt,
      status: payload.status || "active",
      createdAt: new Date().toISOString(),
    };
    this.verifications.set(record.verificationId, record);
    return structuredClone(record);
  }

  async getActiveVerification(ownerId) {
    const now = Date.now();
    for (const record of this.verifications.values()) {
      if (record.ownerId === String(ownerId) && record.status === "active") {
        if (!record.expiresAt || new Date(record.expiresAt).getTime() > now) {
          return structuredClone(record);
        }
      }
    }
    return null;
  }

  async createPromotion(payload) {
    const promo = {
      promotionId: payload.promotionId || this._id("promo"),
      listingId: String(payload.listingId),
      ownerId: String(payload.ownerId),
      type: payload.type,
      pricePaid: Number(payload.pricePaid || 0),
      expiresAt: payload.expiresAt,
      createdAt: new Date().toISOString(),
    };
    this.promotions.set(promo.promotionId, promo);
    return structuredClone(promo);
  }

  async createOffer(payload) {
    const offer = {
      offerId: payload.offerId || this._id("offer"),
      listingId: String(payload.listingId),
      buyerId: String(payload.buyerId),
      ownerId: String(payload.ownerId),
      type: payload.type || "offer",
      amount: payload.amount != null ? Number(payload.amount) : null,
      message: payload.message || "",
      appointmentAt: payload.appointmentAt || null,
      status: payload.status || "pending",
      expiresAt: payload.expiresAt,
      conversationId: payload.conversationId || null,
      createdAt: new Date().toISOString(),
    };
    this.offers.set(offer.offerId, offer);
    return structuredClone(offer);
  }

  async getOffer(offerId) {
    const item = this.offers.get(String(offerId));
    return item ? structuredClone(item) : null;
  }

  async updateOffer(offerId, patch) {
    const existing = this.offers.get(String(offerId));
    if (!existing) return null;
    const updated = { ...existing, ...patch, offerId: existing.offerId };
    this.offers.set(existing.offerId, updated);
    return structuredClone(updated);
  }

  async listOffers(filters = {}) {
    return [...this.offers.values()]
      .filter((item) => {
        if (filters.listingId && item.listingId !== String(filters.listingId)) return false;
        if (filters.ownerId && item.ownerId !== String(filters.ownerId)) return false;
        if (filters.buyerId && item.buyerId !== String(filters.buyerId)) return false;
        if (filters.status && item.status !== filters.status) return false;
        return true;
      })
      .map((item) => structuredClone(item));
  }

  async createReport(payload) {
    const report = {
      reportId: payload.reportId || this._id("report"),
      listingId: String(payload.listingId),
      reporterId: String(payload.reporterId),
      reason: payload.reason,
      details: payload.details || "",
      status: payload.status || "pending",
      adminNotes: payload.adminNotes || "",
      createdAt: new Date().toISOString(),
    };
    this.reports.set(report.reportId, report);
    return structuredClone(report);
  }

  async listReports(filters = {}) {
    return [...this.reports.values()]
      .filter((item) => {
        if (filters.status && item.status !== filters.status) return false;
        return true;
      })
      .map((item) => structuredClone(item));
  }

  async updateReport(reportId, patch) {
    const existing = this.reports.get(String(reportId));
    if (!existing) return null;
    const updated = { ...existing, ...patch, reportId: existing.reportId };
    this.reports.set(existing.reportId, updated);
    return structuredClone(updated);
  }

  storeInboxMessage(payload) {
    const key = payload.conversationId;
    const messages = this.inbox.get(key) || [];
    messages.push({ ...payload, createdAt: new Date().toISOString() });
    this.inbox.set(key, messages);
    return payload;
  }

  getInboxMessages(conversationId) {
    return [...(this.inbox.get(String(conversationId)) || [])];
  }
}

module.exports = PropertyMobilityRepository;
