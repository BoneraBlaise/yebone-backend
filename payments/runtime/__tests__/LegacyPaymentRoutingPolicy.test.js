const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const LegacyPaymentRoutingPolicy = require("../migration/LegacyPaymentRoutingPolicy");

describe("LegacyPaymentRoutingPolicy", () => {
  it("defaults to legacy charge path when disabled", () => {
    const policy = new LegacyPaymentRoutingPolicy({ enabled: false });
    assert.equal(policy.shouldUseLegacyCharge("MTN_MOMO"), true);
  });

  it("routes configured providers to foundation when enabled", () => {
    const policy = new LegacyPaymentRoutingPolicy({
      enabled: true,
      foundationChargeProviders: ["MTN_MOMO"],
    });
    assert.equal(policy.shouldUseLegacyCharge("MTN_MOMO"), false);
    assert.equal(policy.shouldUseLegacyCharge("PAYPACK"), true);
  });
});
