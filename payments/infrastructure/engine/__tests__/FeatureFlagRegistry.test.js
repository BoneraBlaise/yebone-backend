const { describe, it, beforeEach } = require("node:test");
const assert = require("node:assert/strict");
const FeatureFlagRegistry = require("../FeatureFlagRegistry");
const PaymentEngineDisabledError = require("../errors/PaymentEngineDisabledError");

describe("FeatureFlagRegistry", () => {
  let flags;

  beforeEach(() => {
    flags = new FeatureFlagRegistry();
  });

  it("defaults all flags to OFF", () => {
    const list = flags.list();
    assert.equal(list.paymentEngineEnabled, false);
    assert.equal(list.mtnEnabled, false);
    assert.equal(list.airtelEnabled, false);
    assert.equal(list.flutterwaveEnabled, false);
    assert.equal(list.paypackEnabled, false);
    assert.equal(list.stripeEnabled, false);
  });

  it("enables and disables known flags", () => {
    flags.enable("mtnEnabled");
    assert.equal(flags.isEnabled("mtnEnabled"), true);
    flags.disable("mtnEnabled");
    assert.equal(flags.isEnabled("mtnEnabled"), false);
  });

  it("throws when enabling unknown flag", () => {
    assert.throws(() => flags.enable("unknownFlag"), /Unknown feature flag/);
  });

  it("assertEngineEnabled throws PaymentEngineDisabledError when OFF", () => {
    assert.throws(() => flags.assertEngineEnabled(), PaymentEngineDisabledError);
  });

  it("maps provider codes to feature flags", () => {
    assert.equal(FeatureFlagRegistry.getProviderFlagName("MTN_MOMO"), "mtnEnabled");
    assert.equal(flags.isProviderEnabled("MTN_MOMO"), false);
    flags.enable("mtnEnabled");
    assert.equal(flags.isProviderEnabled("MTN_MOMO"), true);
  });
});
