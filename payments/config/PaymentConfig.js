const { PaymentMethod, ProviderCode } = require("../enums");

/**
 * Provider-independent payment configuration.
 * Selection rules live here — not inside PaymentService.
 */
class PaymentConfig {
  constructor(options = {}) {
    this.defaultProvider = options.defaultProvider || ProviderCode.STRIPE;
    this.enabledProviders = options.enabledProviders || [];
    this.methodProviderMap = options.methodProviderMap || {
      [PaymentMethod.CARD]: ProviderCode.STRIPE,
      [PaymentMethod.MOBILE_MONEY]: ProviderCode.MTN_MOMO,
      [PaymentMethod.BANK]: ProviderCode.BANK_TRANSFER,
      [PaymentMethod.WALLET]: ProviderCode.PAYPACK,
      [PaymentMethod.CASH_ON_DELIVERY]: null,
    };
    this.countryProviderOverrides = options.countryProviderOverrides || {};
    this.currency = options.currency || "USD";
  }

  isProviderEnabled(code) {
    if (!this.enabledProviders.length) {
      return false;
    }
    return this.enabledProviders.includes(code);
  }

  getProviderForMethod(method, country = null) {
    if (country && this.countryProviderOverrides[country]?.[method]) {
      return this.countryProviderOverrides[country][method];
    }
    return this.methodProviderMap[method] || this.defaultProvider;
  }
}

module.exports = PaymentConfig;
