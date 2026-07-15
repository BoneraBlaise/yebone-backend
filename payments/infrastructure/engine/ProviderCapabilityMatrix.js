const PaymentEngineConfig = require("./PaymentEngineConfig");
const { ProviderCapability } = require("./ProviderCapabilities");

/**
 * Default capability matrix per provider — metadata only.
 */
const DEFAULT_PROVIDER_MATRIX = Object.freeze({
  MTN_MOMO: {
    name: "MTN Mobile Money",
    capabilities: [
      ProviderCapability.PAYMENTS,
      ProviderCapability.REFUNDS,
      ProviderCapability.PAYOUTS,
      ProviderCapability.WEBHOOKS,
    ],
    supportedCountries: ["RW", "UG", "GH", "CM"],
    supportedCurrencies: ["RWF", "UGX", "GHS", "XAF"],
    supportedMethods: ["MOBILE_MONEY"],
    supportedOperations: [
      ProviderCapability.PAYMENTS,
      ProviderCapability.REFUNDS,
      ProviderCapability.PAYOUTS,
      ProviderCapability.WEBHOOKS,
    ],
  },
  AIRTEL_MONEY: {
    name: "Airtel Money",
    capabilities: [
      ProviderCapability.PAYMENTS,
      ProviderCapability.REFUNDS,
      ProviderCapability.PAYOUTS,
      ProviderCapability.WEBHOOKS,
    ],
    supportedCountries: ["RW", "UG", "KE", "TZ"],
    supportedCurrencies: ["RWF", "UGX", "KES", "TZS"],
    supportedMethods: ["MOBILE_MONEY"],
    supportedOperations: [
      ProviderCapability.PAYMENTS,
      ProviderCapability.REFUNDS,
      ProviderCapability.PAYOUTS,
      ProviderCapability.WEBHOOKS,
    ],
  },
  PAYPACK: {
    name: "Paypack",
    capabilities: [
      ProviderCapability.PAYMENTS,
      ProviderCapability.REFUNDS,
      ProviderCapability.WEBHOOKS,
    ],
    supportedCountries: ["RW"],
    supportedCurrencies: ["RWF"],
    supportedMethods: ["MOBILE_MONEY", "CARD"],
    supportedOperations: [
      ProviderCapability.PAYMENTS,
      ProviderCapability.REFUNDS,
      ProviderCapability.WEBHOOKS,
    ],
  },
  FLUTTERWAVE: {
    name: "Flutterwave",
    capabilities: [
      ProviderCapability.PAYMENTS,
      ProviderCapability.REFUNDS,
      ProviderCapability.PAYOUTS,
      ProviderCapability.WEBHOOKS,
      ProviderCapability.SUBSCRIPTIONS,
    ],
    supportedCountries: ["RW", "NG", "GH", "KE", "UG", "TZ"],
    supportedCurrencies: ["RWF", "NGN", "GHS", "KES", "UGX", "TZS", "USD"],
    supportedMethods: ["MOBILE_MONEY", "CARD", "BANK_TRANSFER"],
    supportedOperations: [
      ProviderCapability.PAYMENTS,
      ProviderCapability.REFUNDS,
      ProviderCapability.PAYOUTS,
      ProviderCapability.WEBHOOKS,
      ProviderCapability.SUBSCRIPTIONS,
    ],
  },
  STRIPE: {
    name: "Stripe",
    capabilities: [
      ProviderCapability.PAYMENTS,
      ProviderCapability.REFUNDS,
      ProviderCapability.PAYOUTS,
      ProviderCapability.WEBHOOKS,
      ProviderCapability.SUBSCRIPTIONS,
    ],
    supportedCountries: ["US", "GB", "RW"],
    supportedCurrencies: ["USD", "GBP", "RWF", "EUR"],
    supportedMethods: ["CARD"],
    supportedOperations: [
      ProviderCapability.PAYMENTS,
      ProviderCapability.REFUNDS,
      ProviderCapability.PAYOUTS,
      ProviderCapability.WEBHOOKS,
      ProviderCapability.SUBSCRIPTIONS,
    ],
  },
});

module.exports = DEFAULT_PROVIDER_MATRIX;
