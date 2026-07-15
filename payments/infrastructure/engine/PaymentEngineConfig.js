/**
 * Payment Engine bootstrap configuration.
 * All feature flags default OFF — nothing activates at runtime without explicit enable.
 */
const PaymentEngineConfig = {
  version: "4.0.0-bootstrap",
  defaultCurrency: "RWF",
  idempotencyScope: "payment-engine",
  providerCodes: Object.freeze({
    MTN_MOMO: "MTN_MOMO",
    AIRTEL_MONEY: "AIRTEL_MONEY",
    PAYPACK: "PAYPACK",
    FLUTTERWAVE: "FLUTTERWAVE",
    STRIPE: "STRIPE",
  }),
  paymentMethods: Object.freeze({
    MOBILE_MONEY: "MOBILE_MONEY",
    CARD: "CARD",
    WALLET: "WALLET",
    BANK_TRANSFER: "BANK_TRANSFER",
  }),
};

module.exports = PaymentEngineConfig;
