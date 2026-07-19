class AffiliateCommerceService {
  constructor({ AmbassadorModel = null, useMemoryOnly = false } = {}) {
    this.AmbassadorModel = AmbassadorModel;
    this.useMemoryOnly = useMemoryOnly;
    this.memory = new Map();
  }

  setModel(model) {
    this.AmbassadorModel = model;
  }

  async upsertAmbassador(userId, payload = {}) {
    const record = {
      userId: String(userId),
      displayName: payload.displayName || "Ambassador",
      bio: payload.bio || "",
      avatarUrl: payload.avatarUrl || "",
      campaignIds: payload.campaignIds || [],
      referralCode: payload.referralCode || null,
      status: payload.status || "active",
      stats: payload.stats || { clicks: 0, orders: 0, revenue: 0, commission: 0 },
    };

    if (this.useMemoryOnly || !this.AmbassadorModel) {
      this.memory.set(record.userId, record);
      return structuredClone(record);
    }

    return this.AmbassadorModel.findOneAndUpdate({ userId: record.userId }, record, {
      upsert: true,
      new: true,
    }).lean();
  }

  async getAmbassador(userId) {
    if (this.useMemoryOnly || !this.AmbassadorModel) {
      return this.memory.get(String(userId)) || null;
    }
    return this.AmbassadorModel.findOne({ userId: String(userId) }).lean();
  }

  async listAmbassadors() {
    if (this.useMemoryOnly || !this.AmbassadorModel) {
      return [...this.memory.values()];
    }
    return this.AmbassadorModel.find().sort({ updatedAt: -1 }).lean();
  }

  async generateAffiliateLink(userId, productId, frontendUrl) {
    const { getGrowthPlatform } = require("../growth");
    const growth = getGrowthPlatform();
    const result = await growth.generateShareLink(userId, productId, frontendUrl);

    const ambassador = await this.getAmbassador(userId);
    if (ambassador) {
      await this.upsertAmbassador(userId, {
        ...ambassador,
        referralCode: result.referralCode,
      });
    }

    return result;
  }

  async getReferralDashboard(userId) {
    const { getGrowthPlatform } = require("../growth");
    const growth = getGrowthPlatform();
    const ledger = await growth.getRewardLedger(userId, { limit: 50 });
    const ambassador = await this.getAmbassador(userId);

    return {
      ambassador,
      ledger,
      performance: ambassador?.stats || { clicks: 0, orders: 0, revenue: 0, commission: 0 },
    };
  }

  async assignCampaign(userId, campaignId) {
    const ambassador = (await this.getAmbassador(userId)) || { userId: String(userId), campaignIds: [] };
    const campaignIds = new Set([...(ambassador.campaignIds || []), String(campaignId)]);
    return this.upsertAmbassador(userId, { ...ambassador, campaignIds: [...campaignIds] });
  }
}

module.exports = AffiliateCommerceService;
