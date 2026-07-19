const DeliveryConfigStore = require("./DeliveryConfigStore");
const FeatureFlagService = require("./FeatureFlagService");
const DeliveryConfigValidation = require("./DeliveryConfigValidation");
const DeliveryConfigAnalytics = require("./DeliveryConfigAnalytics");
const DeliveryOperationGuard = require("./DeliveryOperationGuard");

class DeliveryConfigurationPlatform {
  constructor(options = {}) {
    this.config = {
      version: options.version || "8.3.0",
      phase: options.phase || "8.3",
      name: options.name || "Yebone Delivery Configuration",
    };
    this.store = options.store || new DeliveryConfigStore(options.storeOptions || {});
    if (options.model) this.store.setModel(options.model);
    this.featureFlags = new FeatureFlagService(this.store);
    this.analytics = new DeliveryConfigAnalytics();
    this.guard = new DeliveryOperationGuard({
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
      updatedAt: new Date().toISOString(),
    };
  }

  getFeatures() {
    const features = this.featureFlags.getPublicFeatures();
    return {
      features,
      yeboneDeliveryComingSoon: !features.yeboneDelivery,
    };
  }

  getCheckoutOptions() {
    const features = this.featureFlags.getPublicFeatures();
    return {
      vendorDelivery: features.vendorDelivery,
      customerPickup: features.customerPickup,
      yeboneDelivery: features.yeboneDelivery,
      yeboneDeliveryComingSoon: !features.yeboneDelivery,
    };
  }

  async updateConfiguration(input = {}, { admin = "system", reason = null } = {}) {
    const validation = DeliveryConfigValidation.validateUpdate(input);
    if (!validation.valid) {
      const error = new Error(`Invalid configuration update: ${validation.reason}`);
      error.statusCode = 400;
      error.reason = validation.reason;
      throw error;
    }
    const result = await this.store.updateSettings(validation.settings, { admin, reason });
    if (result.changes.length) this.analytics.recordConfigurationChange();
    return {
      configuration: this.getConfiguration(),
      changes: result.changes,
    };
  }

  getAuditHistory(limit = 100) {
    return this.store.getAuditLog(limit);
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
}

module.exports = DeliveryConfigurationPlatform;
