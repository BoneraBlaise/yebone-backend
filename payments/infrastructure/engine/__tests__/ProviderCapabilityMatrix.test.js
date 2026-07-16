const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const ProviderRegistry = require("../ProviderRegistry");
const ProviderResolver = require("../ProviderResolver");
const FeatureFlagRegistry = require("../FeatureFlagRegistry");
const { ProviderCapability } = require("../ProviderCapabilities");
const DEFAULT_PROVIDER_MATRIX = require("../ProviderCapabilityMatrix");

describe("Provider capability matrix", () => {
  it("registers default providers with capability metadata", () => {
    const registry = new ProviderRegistry();
    registry.registerDefaults();

    const mtn = registry.resolve("MTN_MOMO");
    assert.equal(mtn.name, "MTN Mobile Money");
    assert.ok(mtn.capabilities.includes(ProviderCapability.PAYMENTS));
    assert.ok(mtn.supportedCountries.includes("RW"));
    assert.ok(mtn.supportedCurrencies.includes("RWF"));
    assert.ok(mtn.supportedMethods.includes("MOBILE_MONEY"));
  });

  it("answers supports() without provider-specific branching", () => {
    const registry = new ProviderRegistry();
    registry.registerDefaults();

    const mtn = registry.resolve("MTN_MOMO");
    const stripe = registry.resolve("STRIPE");

    assert.equal(mtn.supports("payments"), true);
    assert.equal(mtn.supports("refund"), true);
    assert.equal(mtn.supports("subscription"), false);
    assert.equal(stripe.supports("subscription"), true);
    assert.equal(stripe.supports("wallet"), false);
  });

  it("finds providers by capability", () => {
    const registry = new ProviderRegistry();
    registry.registerDefaults();

    const subscriptionProviders = registry.findByCapability("subscriptions");
    assert.ok(subscriptionProviders.some((entry) => entry.code === "STRIPE"));
    assert.ok(!subscriptionProviders.some((entry) => entry.code === "MTN_MOMO"));
  });

  it("includes reconciliation capability in default matrix metadata", () => {
    const registry = new ProviderRegistry();
    registry.registerDefaults();

    const flutterwave = registry.resolve("FLUTTERWAVE");
    const paypack = registry.resolve("PAYPACK");

    assert.equal(flutterwave.supports("reconciliation"), true);
    assert.equal(paypack.supports("reconcile"), true);
    assert.equal(paypack.supports("payout"), true);
  });

  it("resolver supports capability queries", () => {
    const registry = new ProviderRegistry();
    registry.registerDefaults();
    const resolver = new ProviderResolver({
      registry,
      featureFlags: new FeatureFlagRegistry(),
    });

    assert.equal(resolver.supports("FLUTTERWAVE", "payouts"), true);
    assert.equal(resolver.supports("PAYPACK", "payout"), true);
  });

  it("documents matrix entries for all default providers", () => {
    const codes = Object.keys(DEFAULT_PROVIDER_MATRIX);
    assert.deepEqual(codes.sort(), [
      "AIRTEL_MONEY",
      "FLUTTERWAVE",
      "MTN_MOMO",
      "PAYPACK",
      "STRIPE",
    ]);
  });
});
