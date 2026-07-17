/**
 * Runtime configuration abstraction — optional env overrides, no schema changes.
 */
class RuntimeConfig {
  constructor(options = {}) {
    this.serviceName = options.serviceName || "yebone-payments";
    this.environment = options.environment || "development";
    this.apiVersion = options.apiVersion || "v1";
    this.enablePaymentRoutes = options.enablePaymentRoutes !== false;
    this.enableWebhooks = options.enableWebhooks === true;
    this.enableBackgroundJobs = options.enableBackgroundJobs === true;
    this.composePaymentFoundation = options.composePaymentFoundation === true;
    this.applyFeatureFlagRollout = options.applyFeatureFlagRollout === true;
    this.enableWebhookReconciliation = options.enableWebhookReconciliation === true;
    this.enableWebhookSettlement = options.enableWebhookSettlement === true;
    this.enableLegacyRoutingPolicy = options.enableLegacyRoutingPolicy === true;
    this.shutdownTimeoutMs = options.shutdownTimeoutMs || 10000;
    this.logLevel = options.logLevel || "info";
    this.correlationHeader = options.correlationHeader || "x-correlation-id";
  }

  isProduction() {
    return this.environment === "production";
  }
}

module.exports = RuntimeConfig;
