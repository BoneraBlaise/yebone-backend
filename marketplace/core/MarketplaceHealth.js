/**
 * Marketplace health diagnostics — independent from payment health.
 */
class MarketplaceHealth {
  constructor(core) {
    this.core = core;
  }

  check() {
    const lifecycle = this.core.lifecycle.snapshot();
    const enabledFeatures = this.core.features.listEnabled();

    return Object.freeze({
      healthy: lifecycle.state === "ready",
      marketplace: this.core.config.name,
      apiVersion: this.core.config.apiVersion,
      lifecycle,
      enabledFeatures,
      paymentHooksEnabled: this.core.config.enablePaymentHooks,
      checkedAt: new Date().toISOString(),
    });
  }
}

module.exports = MarketplaceHealth;
