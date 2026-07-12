const ConfigurationRegistry = require("./ConfigurationRegistry");
const RuntimeConfiguration = require("./RuntimeConfiguration");

/**
 * Central configuration manager — application, payment, infrastructure, feature flags.
 */
class ConfigurationManager {
  constructor({ provider, registry } = {}) {
    this.provider = provider || new RuntimeConfiguration();
    this.registry = registry || new ConfigurationRegistry();
    this._bootstrapDefaults();
  }

  _bootstrapDefaults() {
    const application = new RuntimeConfiguration({
      serviceName: "yebone-payments",
      environment: "development",
      apiVersion: "v1",
    });

    const payment = new RuntimeConfiguration({
      defaultCurrency: "USD",
      idempotencyEnabled: true,
      escrowEnabled: true,
    });

    const infrastructure = new RuntimeConfiguration({
      cacheEnabled: true,
      queueEnabled: true,
      monitoringEnabled: true,
      auditLoggingEnabled: true,
    });

    const featureFlags = new RuntimeConfiguration();
    featureFlags.setFeatureFlag("webhooks", false);
    featureFlags.setFeatureFlag("backgroundJobs", true);
    featureFlags.setFeatureFlag("providerIntegrations", false);

    this.registry
      .register("application", application)
      .register("payment", payment)
      .register("infrastructure", infrastructure)
      .register("featureFlags", featureFlags);
  }

  getApplicationConfig() {
    return this.registry.get("application");
  }

  getPaymentConfig() {
    return this.registry.get("payment");
  }

  getInfrastructureConfig() {
    return this.registry.get("infrastructure");
  }

  getFeatureFlags() {
    return this.registry.get("featureFlags");
  }

  isFeatureEnabled(name) {
    return this.getFeatureFlags()?.isFeatureEnabled(name) ?? false;
  }

  get(key, defaultValue = null) {
    return this.provider.get(key, defaultValue);
  }

  set(key, value) {
    return this.provider.set(key, value);
  }

  all() {
    return {
      provider: this.provider.all(),
      registry: this.registry.all(),
    };
  }
}

module.exports = ConfigurationManager;
