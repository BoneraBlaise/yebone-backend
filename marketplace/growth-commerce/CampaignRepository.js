const crypto = require("crypto");

class CampaignRepository {
  constructor({ useMemoryOnly = false, CampaignModel = null } = {}) {
    this.useMemoryOnly = useMemoryOnly;
    this.CampaignModel = CampaignModel;
    this.memory = new Map();
  }

  setModel(model) {
    this.CampaignModel = model;
  }

  _generateId() {
    return `gc_${Date.now()}_${crypto.randomBytes(3).toString("hex")}`;
  }

  async create(payload) {
    const campaign = {
      campaignId: payload.campaignId || this._generateId(),
      ...payload,
      analytics: payload.analytics || { views: 0, clicks: 0, orders: 0, revenue: 0 },
    };

    if (this.useMemoryOnly || !this.CampaignModel) {
      this.memory.set(campaign.campaignId, structuredClone(campaign));
      return structuredClone(campaign);
    }

    const doc = await this.CampaignModel.create(campaign);
    return doc.toObject();
  }

  async findById(campaignId) {
    if (this.useMemoryOnly || !this.CampaignModel) {
      const item = this.memory.get(String(campaignId));
      return item ? structuredClone(item) : null;
    }
    return this.CampaignModel.findOne({ campaignId: String(campaignId) }).lean();
  }

  async list(filters = {}) {
    const query = {};
    if (filters.vendorId) query.vendorId = String(filters.vendorId);
    if (filters.status) query.status = String(filters.status);
    if (filters.type) query.type = String(filters.type);

    if (this.useMemoryOnly || !this.CampaignModel) {
      return [...this.memory.values()]
        .filter((item) => {
          if (filters.vendorId && item.vendorId !== String(filters.vendorId)) return false;
          if (filters.status && item.status !== String(filters.status)) return false;
          if (filters.type && item.type !== String(filters.type)) return false;
          return true;
        })
        .map((item) => structuredClone(item));
    }

    return this.CampaignModel.find(query).sort({ updatedAt: -1 }).lean();
  }

  async update(campaignId, patch = {}) {
    if (this.useMemoryOnly || !this.CampaignModel) {
      const existing = this.memory.get(String(campaignId));
      if (!existing) return null;
      const updated = { ...existing, ...patch, campaignId: existing.campaignId };
      this.memory.set(existing.campaignId, updated);
      return structuredClone(updated);
    }

    return this.CampaignModel.findOneAndUpdate(
      { campaignId: String(campaignId) },
      { $set: patch },
      { new: true }
    ).lean();
  }

  async incrementAnalytics(campaignId, delta = {}) {
    const inc = {};
    for (const [key, value] of Object.entries(delta)) {
      if (Number.isFinite(Number(value))) inc[`analytics.${key}`] = Number(value);
    }
    if (!Object.keys(inc).length) return this.findById(campaignId);

    if (this.useMemoryOnly || !this.CampaignModel) {
      const existing = await this.findById(campaignId);
      if (!existing) return null;
      existing.analytics = existing.analytics || {};
      for (const [key, value] of Object.entries(delta)) {
        existing.analytics[key] = (existing.analytics[key] || 0) + Number(value);
      }
      this.memory.set(existing.campaignId, existing);
      return structuredClone(existing);
    }

    return this.CampaignModel.findOneAndUpdate(
      { campaignId: String(campaignId) },
      { $inc: inc },
      { new: true }
    ).lean();
  }

  resetForTests() {
    this.memory.clear();
  }
}

module.exports = CampaignRepository;
