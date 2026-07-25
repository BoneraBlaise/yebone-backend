const { randomUUID } = require("crypto");

const SECTION_MODULE_MAP = Object.freeze({
  categoryCommissions: "commission",
  referral: "referral",
  aiProducts: "ai",
  pricing: "platform",
  ruleEngine: "commission-rules",
  couponDefaults: "coupons",
  banners: "banners",
  runtimeFeatures: "feature-flags",
  deliveryPricing: "delivery",
  deliveryZones: "delivery",
  deliveryPartners: "delivery",
  delivery: "delivery",
  growth: "growth",
});

class ConfigurationHistoryService {
  constructor() {
    this.ConfigurationHistoryModel = null;
  }

  setModel(model) {
    this.ConfigurationHistoryModel = model;
  }

  resolveModule(section, module = null) {
    if (module) return module;
    return SECTION_MODULE_MAP[section] || "platform";
  }

  async record(entry = {}) {
    const payload = {
      historyId: entry.historyId || randomUUID(),
      module: this.resolveModule(entry.section, entry.module),
      section: entry.section || null,
      action: entry.action || "draft.save",
      status: entry.status || "draft",
      oldValue: entry.oldValue ?? null,
      newValue: entry.newValue ?? null,
      changedBy: entry.changedBy || "system",
      note: entry.note || null,
      version: Number(entry.version || 1),
      timestamp: entry.timestamp ? new Date(entry.timestamp) : new Date(),
    };

    if (this.ConfigurationHistoryModel) {
      await this.ConfigurationHistoryModel.create(payload);
    }

    return payload;
  }

  async list(filters = {}) {
    const {
      module = null,
      changedBy = null,
      from = null,
      to = null,
      search = "",
      limit = 100,
      page = 1,
    } = filters;

    if (!this.ConfigurationHistoryModel) {
      return { items: [], meta: { total: 0, page: 1, limit } };
    }

    const query = {};
    if (module) query.module = module;
    if (changedBy) query.changedBy = changedBy;
    if (from || to) {
      query.timestamp = {};
      if (from) query.timestamp.$gte = new Date(from);
      if (to) query.timestamp.$lte = new Date(to);
    }
    if (search) {
      query.$or = [
        { module: new RegExp(search, "i") },
        { section: new RegExp(search, "i") },
        { note: new RegExp(search, "i") },
        { changedBy: new RegExp(search, "i") },
        { action: new RegExp(search, "i") },
      ];
    }

    const skip = (Math.max(Number(page), 1) - 1) * Number(limit);
    const [items, total] = await Promise.all([
      this.ConfigurationHistoryModel.find(query)
        .sort({ timestamp: -1 })
        .skip(skip)
        .limit(Number(limit))
        .lean(),
      this.ConfigurationHistoryModel.countDocuments(query),
    ]);

    return {
      items,
      meta: { total, page: Number(page), limit: Number(limit) },
    };
  }

  async getByHistoryId(historyId) {
    if (!this.ConfigurationHistoryModel) return null;
    return this.ConfigurationHistoryModel.findOne({ historyId }).lean();
  }
}

let historyServiceInstance = null;

function getConfigurationHistoryService() {
  if (!historyServiceInstance) {
    historyServiceInstance = new ConfigurationHistoryService();
    try {
      historyServiceInstance.setModel(require("../../model/configurationHistory"));
    } catch {
      /* model optional in tests */
    }
  }
  return historyServiceInstance;
}

module.exports = {
  ConfigurationHistoryService,
  getConfigurationHistoryService,
  SECTION_MODULE_MAP,
};
