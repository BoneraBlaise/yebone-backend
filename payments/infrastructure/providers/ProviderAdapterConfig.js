/**
 * Module 9 — Provider Adapter Foundation configuration.
 * Skeleton adapters only; no credentials, SDKs, or HTTP.
 */
const ProviderAdapterConfig = Object.freeze({
  version: "9.0.0-provider-adapters",
  mockResponsePrefix: "mock",
  supportedProviderCodes: Object.freeze([
    "MTN_MOMO",
    "AIRTEL_MONEY",
    "PAYPACK",
    "FLUTTERWAVE",
    "STRIPE",
  ]),
});

module.exports = ProviderAdapterConfig;
