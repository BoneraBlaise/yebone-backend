/**
 * Registered payment provider identifiers.
 * Extend this enum when adding new providers without changing PaymentService.
 */
const ProviderCode = Object.freeze({
  STRIPE: "STRIPE",
  FLUTTERWAVE: "FLUTTERWAVE",
  PAYPACK: "PAYPACK",
  MTN_MOMO: "MTN_MOMO",
  AIRTEL_MONEY: "AIRTEL_MONEY",
  BANK_TRANSFER: "BANK_TRANSFER",
  CRYPTO: "CRYPTO",
});

module.exports = ProviderCode;
