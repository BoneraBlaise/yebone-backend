class InvalidCurrencyError extends Error {
  constructor(currency, supported = []) {
    super(`Invalid currency: ${currency}`);
    this.name = "InvalidCurrencyError";
    this.code = "INVALID_CURRENCY";
    this.currency = currency;
    this.supported = supported;
  }
}

module.exports = InvalidCurrencyError;
