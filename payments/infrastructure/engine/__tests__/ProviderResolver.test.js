const { describe, it, beforeEach } = require("node:test");
const assert = require("node:assert/strict");
const ProviderRegistry = require("../ProviderRegistry");
const ProviderResolver = require("../ProviderResolver");
const FeatureFlagRegistry = require("../FeatureFlagRegistry");
const ProviderDisabledError = require("../errors/ProviderDisabledError");
const ProviderNotResolvedError = require("../errors/ProviderNotResolvedError");

describe("ProviderResolver", () => {
  let registry;
  let featureFlags;
  let resolver;

  beforeEach(() => {
    registry = new ProviderRegistry();
    registry.registerDefaults();
    featureFlags = new FeatureFlagRegistry();
    resolver = new ProviderResolver({ registry, featureFlags });
  });

  it("resolves provider by explicit code when enabled", () => {
    registry.enable("MTN_MOMO");
    featureFlags.enable("mtnEnabled");

    const entry = resolver.resolve({ providerCode: "MTN_MOMO" });
    assert.equal(entry.code, "MTN_MOMO");
  });

  it("throws when provider registry entry is disabled", () => {
    featureFlags.enable("mtnEnabled");
    assert.throws(
      () => resolver.resolve({ providerCode: "MTN_MOMO" }),
      ProviderDisabledError
    );
  });

  it("throws when provider feature flag is OFF", () => {
    registry.enable("MTN_MOMO");
    assert.throws(
      () => resolver.resolve({ providerCode: "MTN_MOMO" }),
      ProviderDisabledError
    );
  });

  it("resolves by country and payment method", () => {
    registry.enable("MTN_MOMO");
    featureFlags.enable("mtnEnabled");

    const entry = resolver.resolve({
      countryCode: "RW",
      paymentMethod: "MOBILE_MONEY",
    });
    assert.equal(entry.code, "MTN_MOMO");
  });

  it("throws when no provider matches criteria", () => {
    assert.throws(
      () => resolver.resolve({ countryCode: "ZZ", paymentMethod: "MOBILE_MONEY" }),
      ProviderNotResolvedError
    );
  });

  it("lists available enabled providers", () => {
    registry.enable("STRIPE");
    featureFlags.enable("stripeEnabled");
    const available = resolver.listAvailable({ countryCode: "US", paymentMethod: "CARD" });
    assert.ok(available.some((entry) => entry.code === "STRIPE"));
  });
});
