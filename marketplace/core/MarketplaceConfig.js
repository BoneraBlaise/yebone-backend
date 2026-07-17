/**
 * Canonical marketplace configuration — environment-driven, no payment flags.
 */
class MarketplaceConfig {
  constructor(options = {}) {
    this.name = options.name || process.env.MARKETPLACE_NAME || "Yebone";
    this.apiVersion = options.apiVersion || "v2";
    this.defaultCurrency = options.defaultCurrency || process.env.MARKETPLACE_CURRENCY || "RWF";
    this.defaultCountry = options.defaultCountry || process.env.MARKETPLACE_COUNTRY || "RW";
    this.enablePaymentHooks = options.enablePaymentHooks !== false;
    this.serviceChargeRate = Number(options.serviceChargeRate ?? 0.1);
  }
}

module.exports = MarketplaceConfig;
