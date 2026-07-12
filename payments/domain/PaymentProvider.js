const { ProviderCode } = require("../enums");

/**
 * Domain representation of a registered payment provider.
 * Describes capabilities and configuration — not the provider implementation.
 */
class PaymentProvider {
  constructor({
    id = null,
    code,
    displayName,
    enabled = false,
    supportedMethods = [],
    supportedCurrencies = ["USD"],
    supportedCountries = [],
    config = {},
    createdAt = new Date(),
    updatedAt = new Date(),
  }) {
    this.id = id;
    this.code = code;
    this.displayName = displayName;
    this.enabled = enabled;
    this.supportedMethods = supportedMethods;
    this.supportedCurrencies = supportedCurrencies;
    this.supportedCountries = supportedCountries;
    this.config = config;
    this.createdAt = createdAt;
    this.updatedAt = updatedAt;
  }

  static knownCodes() {
    return Object.values(ProviderCode);
  }

  static requiredFields() {
    return ["code", "displayName"];
  }
}

module.exports = PaymentProvider;
