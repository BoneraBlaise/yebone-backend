const PlatformConfigurationStore = require("./PlatformConfigurationStore");

class PlatformConfigurationBridge {
  constructor(options = {}) {
    this.store = options.store || new PlatformConfigurationStore(options.storeOptions || {});
    if (options.model) this.store.setModel(options.model);
    this.initialized = false;
  }

  async initialize() {
    if (!this.initialized) {
      await this.store.initialize();
      this.initialized = true;
    }
    return this.getSnapshot();
  }

  getStore() {
    return this.store;
  }

  getSnapshot() {
    return this.store.getSnapshot();
  }

  getPublicAiProducts() {
    const products = this.store.getBusinessValues().aiProducts || {};
    const features = this.store.getBusinessValues().runtimeFeatures || {};
    return Object.entries(products).map(([id, config]) => {
      const flag = features[id] || features[id.replace(/_/g, "-")] || {};
      const status = flag.status || "enabled";
      return {
        id,
        ...config,
        status,
        available: config.enabled !== false && status === "enabled",
        beta: status === "beta",
        comingSoon: status === "coming_soon",
      };
    });
  }

  getAdminAiProducts() {
    const products = this.store.getDraftBusinessValues().aiProducts || {};
    return Object.entries(products).map(([id, config]) => ({
      id,
      ...config,
    }));
  }

  isFeatureAvailable(featureId) {
    const features = this.store.getBusinessValues().runtimeFeatures || {};
    const flag = features[featureId] || {};
    const status = flag.status || "enabled";
    return status === "enabled" || status === "beta";
  }

  getWorkflowSnapshot() {
    return this.store.getWorkflowSnapshot();
  }

  async saveDraftSection(section, patch, meta = {}) {
    await this.initialize();
    return this.store.saveDraftSection(section, patch, meta);
  }

  async saveModuleDraft(module, values, meta = {}) {
    await this.initialize();
    return this.store.saveModuleDraft(module, values, meta);
  }

  async publishDraft(meta = {}, options = {}) {
    await this.initialize();
    const result = await this.store.publishDraft({ ...meta, ...options });
    const live = result.published || this.store.getBusinessValues();
    if (live.categoryCommissions) {
      await this.syncCategoryCommissionRules(live.categoryCommissions, meta);
    }
    if (live.referral?.categoryRates) {
      await this.syncReferralCategoryRules(live.referral.categoryRates, meta);
    }
    return result;
  }

  async rollbackFromHistory(historyId, meta = {}) {
    await this.initialize();
    const { getConfigurationHistoryService } = require("./ConfigurationHistoryService");
    const entry = await getConfigurationHistoryService().getByHistoryId(historyId);
    if (!entry) {
      throw Object.assign(new Error("History entry not found"), { statusCode: 404 });
    }
    const result = await this.store.rollbackFromHistory(entry, meta);
    const live = result.restored || this.store.getBusinessValues();
    if (live.categoryCommissions) {
      await this.syncCategoryCommissionRules(live.categoryCommissions, meta);
    }
    if (live.referral?.categoryRates) {
      await this.syncReferralCategoryRules(live.referral.categoryRates, meta);
    }
    return { ...result, historyEntry: entry };
  }

  getPublicBanners(type = null) {
    return this.store.getActiveBanners(type);
  }

  async aggregateConfiguration() {
    await this.initialize();
    const snapshot = this.getSnapshot();
    const domains = {};

    try {
      const { getGrowthPlatform } = require("../growth");
      const growth = getGrowthPlatform();
      domains.growth = growth.getConfigurationPlatform().getConfiguration();
    } catch {
      domains.growth = null;
    }

    try {
      const { getDeliveryConfigurationPlatform } = require("../delivery/configuration");
      domains.delivery = getDeliveryConfigurationPlatform().getConfiguration();
    } catch {
      domains.delivery = null;
    }

    try {
      const { getGrowthCommercePlatform } = require("../growth-commerce");
      const gc = getGrowthCommercePlatform();
      domains.growthCommerce = gc.getSettings?.() || gc.configStore?.getSettings?.() || null;
    } catch {
      domains.growthCommerce = null;
    }

    try {
      const { getPropertyMobilityPlatform } = require("../property-mobility");
      const pm = getPropertyMobilityPlatform();
      domains.propertyMobility = {
        settings: pm.getSettings?.() || null,
        pricing: pm.getPricing?.() || null,
      };
    } catch {
      domains.propertyMobility = null;
    }

    try {
      const { getAIPlatform } = require("../ai");
      domains.ai = getAIPlatform().health.check();
    } catch {
      domains.ai = null;
    }

    return {
      platform: snapshot,
      workflow: this.getWorkflowSnapshot(),
      domains,
      aggregatedAt: new Date().toISOString(),
    };
  }

  async updateSection(section, patch, meta = {}) {
    await this.initialize();
    return this.store.updateSection(section, patch, meta);
  }

  async upsertBanner(banner, meta = {}) {
    await this.initialize();
    return this.store.upsertBanner(banner, meta);
  }

  async deleteBanner(id, meta = {}) {
    await this.initialize();
    return this.store.deleteBanner(id, meta);
  }

  getAuditHistory(limit = 50) {
    return this.store.getAuditLog(limit);
  }

  /**
   * Sync category commission UI values to growth commission rules (CATEGORY strategy).
   */
  async syncCategoryCommissionRules(categoryCommissions = {}, { admin = "system", reason = null } = {}) {
    const { getGrowthPlatform } = require("../growth");
    const { PLATFORM_CATEGORIES } = require("./PlatformConfigurationDefaults");
    const platform = getGrowthPlatform();
    const adminService = platform.getCommissionRuleAdmin();
    const existing = adminService.list({ strategy: "CATEGORY", limit: 200 }).items || [];

    for (const categoryId of PLATFORM_CATEGORIES) {
      const config = categoryCommissions[categoryId];
      if (!config) continue;
      const ruleId = `category-${categoryId}`;
      const payload = {
        id: ruleId,
        name: `${categoryId.replace(/_/g, " ")} Commission`,
        description: `Platform commission for ${categoryId}`,
        strategy: "CATEGORY",
        rateType: config.fixedFee > 0 && config.percentage <= 0 ? "FIXED" : "PERCENTAGE",
        rate: config.fixedFee > 0 && config.percentage <= 0 ? Number(config.fixedFee) : Number(config.percentage),
        priority: Number(config.priority ?? 5),
        enabled: config.enabled !== false,
        scope: {
          categoryId,
          minFee: Number(config.minFee || 0),
          maxFee: config.maxFee != null ? Number(config.maxFee) : null,
          fixedFee: Number(config.fixedFee || 0),
          percentage: Number(config.percentage || 0),
        },
        reason: reason || "Category commission sync",
      };

      const found = existing.find((rule) => String(rule.id) === ruleId || rule.scope?.categoryId === categoryId);
      if (found) {
        await adminService.update(found.id, payload, { admin, reason: payload.reason });
      } else {
        await adminService.create(payload, { admin, reason: payload.reason });
      }
    }

    return { synced: PLATFORM_CATEGORIES.length };
  }

  async syncReferralCategoryRules(categoryRates = {}, { admin = "system", reason = null } = {}) {
    const { getGrowthPlatform } = require("../growth");
    const platform = getGrowthPlatform();
    const adminService = platform.getCommissionRuleAdmin();
    const existing = adminService.list({ strategy: "REFERRAL", limit: 200 }).items || [];

    for (const [categoryId, rate] of Object.entries(categoryRates)) {
      const ruleId = `referral-${categoryId}`;
      const payload = {
        id: ruleId,
        name: `${categoryId.replace(/_/g, " ")} Referral`,
        description: `Referral commission for ${categoryId}`,
        strategy: "REFERRAL",
        rateType: "PERCENTAGE",
        rate: Number(rate),
        priority: 10,
        enabled: true,
        scope: { categoryId },
        reason: reason || "Referral category rate sync",
      };
      const found = existing.find(
        (rule) => String(rule.id) === ruleId || rule.scope?.categoryId === categoryId
      );
      if (found) {
        await adminService.update(found.id, payload, { admin, reason: payload.reason });
      } else {
        await adminService.create(payload, { admin, reason: payload.reason });
      }
    }
    return { synced: Object.keys(categoryRates).length };
  }
}

let bridgeInstance = null;

function createPlatformConfigurationBridge(options = {}) {
  bridgeInstance = new PlatformConfigurationBridge(options);
  return bridgeInstance;
}

function getPlatformConfigurationBridge() {
  if (!bridgeInstance) {
    throw new Error("Platform configuration bridge not initialized");
  }
  return bridgeInstance;
}

module.exports = {
  PlatformConfigurationBridge,
  createPlatformConfigurationBridge,
  getPlatformConfigurationBridge,
};
