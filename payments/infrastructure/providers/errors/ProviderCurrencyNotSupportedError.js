class ProviderCurrencyNotSupportedError extends Error {
  constructor(providerCode, currency) {
    super(`Provider ${providerCode} does not support currency ${currency}`);
    this.name = "ProviderCurrencyNotSupportedError";
    this.code = "PROVIDER_CURRENCY_NOT_SUPPORTED";
    this.providerCode = providerCode;
    this.currency = currency;
  }
}

module.exports = ProviderCurrencyNotSupportedError;
