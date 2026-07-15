const { describe, it, beforeEach } = require("node:test");
const assert = require("node:assert/strict");
const { createProviderFoundation, enableMtn } = require("./testHelpers");
const ProviderAdapterDisabledError = require("../errors/ProviderAdapterDisabledError");
const ProviderAdapterNotRegisteredError = require("../errors/ProviderAdapterNotRegisteredError");

describe("ProviderAdapterFeatureGate", () => {
  let foundation;

  beforeEach(() => {
    foundation = createProviderFoundation();
  });

  it("blocks execution by default", () => {
    assert.equal(foundation.featureGate.isExecutable("MTN_MOMO"), false);
    assert.throws(
      () => foundation.featureGate.assertExecutable("MTN_MOMO"),
      ProviderAdapterDisabledError
    );
  });

  it("allows execution only when registry and feature flag are enabled", () => {
    enableMtn(foundation);
    assert.equal(foundation.featureGate.isExecutable("MTN_MOMO"), true);
    const entry = foundation.featureGate.assertExecutable("MTN_MOMO");
    assert.equal(entry.code, "MTN_MOMO");
  });

  it("throws when adapter slot is missing", () => {
    foundation.providerRegistry.register({
      code: "EMPTY",
      enabled: true,
      capabilities: [],
      supportedCountries: [],
      supportedCurrencies: [],
      supportedMethods: [],
    });
    foundation.featureFlags.enable("mtnEnabled");

    assert.throws(
      () => foundation.featureGate.assertExecutable("EMPTY"),
      ProviderAdapterNotRegisteredError
    );
  });

  it("keeps all provider flags disabled in default foundation", () => {
    const flags = foundation.featureFlags.list();
    assert.equal(flags.mtnEnabled, false);
    assert.equal(flags.airtelEnabled, false);
    assert.equal(flags.flutterwaveEnabled, false);
    assert.equal(flags.stripeEnabled, false);
    assert.equal(flags.paypackEnabled, false);
  });
});
