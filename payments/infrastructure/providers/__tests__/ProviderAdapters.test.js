const { describe, it, beforeEach } = require("node:test");
const assert = require("node:assert/strict");
const { createProviderFoundation, enableMtn } = require("./testHelpers");
const ProviderAdapterDisabledError = require("../errors/ProviderAdapterDisabledError");
const ProviderCapabilityError = require("../errors/ProviderCapabilityError");

describe("Provider skeleton adapters", () => {
  let foundation;

  beforeEach(() => {
    foundation = createProviderFoundation();
  });

  for (const [code, flag, sample] of [
    ["MTN_MOMO", "mtnEnabled", { country: "RW", currency: "RWF", paymentMethod: "MOBILE_MONEY" }],
    ["AIRTEL_MONEY", "airtelEnabled", { country: "RW", currency: "RWF", paymentMethod: "MOBILE_MONEY" }],
    ["FLUTTERWAVE", "flutterwaveEnabled", { country: "RW", currency: "RWF", paymentMethod: "MOBILE_MONEY" }],
    ["STRIPE", "stripeEnabled", { country: "US", currency: "USD", paymentMethod: "CARD" }],
    ["PAYPACK", "paypackEnabled", { country: "RW", currency: "RWF", paymentMethod: "MOBILE_MONEY" }],
  ]) {
    it(`${code} returns mock charge response when enabled`, async () => {
      foundation.providerRegistry.enable(code);
      foundation.featureFlags.enable(flag);
      const adapter = foundation.adapterRegistry.getAdapter(code);

      const response = await adapter.charge({
        ...sample,
        amount: 2500,
        reference: "order-test",
      });

      assert.equal(response.success, true);
      assert.equal(response.mock, true);
      assert.equal(response.providerCode, code);
      assert.match(response.externalReference, /^mock_/);
    });
  }

  it("blocks charge when feature flag is disabled", async () => {
    const adapter = foundation.adapterRegistry.getAdapter("MTN_MOMO");
    await assert.rejects(
      () =>
        adapter.charge({
          country: "RW",
          currency: "RWF",
          paymentMethod: "MOBILE_MONEY",
          amount: 100,
          reference: "blocked",
        }),
      ProviderAdapterDisabledError
    );
  });

  it("validates capabilities before mock refund execution", async () => {
    enableMtn(foundation);
    const entry = foundation.providerRegistry.resolve("MTN_MOMO");
    foundation.providerRegistry.register({
      code: "MTN_MOMO",
      name: entry.name,
      capabilities: ["PAYMENTS"],
      supportedOperations: ["PAYMENTS"],
      supportedCountries: entry.supportedCountries,
      supportedCurrencies: entry.supportedCurrencies,
      supportedMethods: entry.supportedMethods,
      enabled: true,
      adapter: entry.adapter,
    });

    const adapter = foundation.adapterRegistry.getAdapter("MTN_MOMO");
    await assert.rejects(
      () =>
        adapter.refund({
          country: "RW",
          currency: "RWF",
          paymentMethod: "MOBILE_MONEY",
          reference: "ref-1",
        }),
      ProviderCapabilityError
    );
  });

  it("exposes health without external calls", () => {
    enableMtn(foundation);
    const adapter = foundation.adapterRegistry.getAdapter("MTN_MOMO");
    const health = adapter.health();
    assert.equal(health.providerCode, "MTN_MOMO");
    assert.equal(health.status, "READY");
  });
});
