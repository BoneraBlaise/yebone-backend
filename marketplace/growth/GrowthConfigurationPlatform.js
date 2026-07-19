const GrowthConfigStore = require("./GrowthConfigStore");
const GrowthFeatureFlagService = require("./GrowthFeatureFlagService");
const GrowthConfigValidation = require("./GrowthConfigValidation");
const GrowthAnalyticsService = require("./GrowthAnalyticsService");
const GrowthAuditService = require("./GrowthAuditService");
const GrowthOperationGuard = require("./GrowthOperationGuard");

class GrowthConfigurationPlatform {
  constructor(options = {}) {
    this.config = {
      version: options.version || "9.1.0",
      phase: options.phase || "9.1",
      name: options.name || "Yebone Growth Configuration",
    };
    this.store = options.store || new GrowthConfigStore(options.storeOptions || {});
    if (options.model) this.store.setModel(options.model);
    this.featureFlags = new GrowthFeatureFlagService(this.store);
    this.analytics = options.analytics || new GrowthAnalyticsService();
    this.audit = new GrowthAuditService(this.store);
    this.guard = new GrowthOperationGuard({
      featureFlags: this.featureFlags,
      analytics: this.analytics,
    });
    this.initialized = false;
  }

  async initialize() {
    if (!this.initialized) {
      await this.store.initialize();
      this.initialized = true;
    }
    return this.getConfiguration();
  }

  getConfiguration() {
    return {
      version: this.config.version,
      phase: this.config.phase,
      settings: this.store.getSettings(),
      commissionRules: this.store.getCommissionRules(),
      updatedAt: new Date().toISOString(),
    };
  }

  getFeatures() {
    return { features: this.featureFlags.getPublicFeatures() };
  }

  async updateConfiguration(input = {}, { admin = "system", reason = null } = {}) {
    const settingsValidation = GrowthConfigValidation.validateSettingsUpdate(input.settings || input);
    const rulesInput = input.commissionRules;
    const changes = [];

    if (settingsValidation.valid) {
      const result = await this.store.updateSettings(settingsValidation.settings, { admin, reason });
      changes.push(...result.changes);
    }

    if (Array.isArray(rulesInput)) {
      const rulesValidation = GrowthConfigValidation.validateCommissionRules(rulesInput);
      if (!rulesValidation.valid) {
        const error = new Error(`Invalid commission rules: ${rulesValidation.reason}`);
        error.statusCode = 400;
        throw error;
      }
      const rulesResult = await this.store.updateCommissionRules(rulesValidation.rules, { admin, reason });
      changes.push(...rulesResult.changes);
    }

    if (!changes.length && !settingsValidation.valid && !Array.isArray(rulesInput)) {
      const error = new Error("Invalid configuration update: NO_VALID_SETTINGS");
      error.statusCode = 400;
      throw error;
    }

    if (changes.length) this.analytics.recordConfigurationChange();
    return { configuration: this.getConfiguration(), changes };
  }

  getAuditHistory(limit = 100) {
    return this.audit.getHistory(limit);
  }

  getMetrics() {
    return this.analytics.getSummary();
  }

  getGuard() {
    return this.guard;
  }

  getFeatureFlags() {
    return this.featureFlags;
  }

  getStore() {
    return this.store;
  }
}

module.exports = GrowthConfigurationPlatform;
