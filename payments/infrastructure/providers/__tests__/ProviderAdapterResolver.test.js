const { describe, it, beforeEach } = require("node:test");
const assert = require("node:assert/strict");
const { createProviderFoundation, enableMtn, enableStripe } = require("./testHelpers");
const ProviderDisabledError = require("../../engine/errors/ProviderDisabledError");
const ProviderCurrencyNotSupportedError = require("../errors/ProviderCurrencyNotSupportedError");
const ProviderNotResolvedError = require("../../engine/errors/ProviderNotResolvedError");

describe("ProviderAdapterResolver", () => {
  let foundation;

  beforeEach(() => {
    foundation = createProviderFoundation();
  });

  it("resolves adapter by providerCode when enabled", () => {
    enableMtn(foundation);
    const resolved = foundation.adapterResolver.resolve({
      providerCode: "MTN_MOMO",
      country: "RW",
      currency: "RWF",
      paymentMethod: "MOBILE_MONEY",
    });
    assert.equal(resolved.descriptor.code, "MTN_MOMO");
    assert.equal(resolved.adapter.providerCode, "MTN_MOMO");
  });

  it("resolves adapter by country and payment method", () => {
    enableMtn(foundation);
    const resolved = foundation.adapterResolver.resolve({
      country: "RW",
      currency: "RWF",
      paymentMethod: "MOBILE_MONEY",
    });
    assert.equal(resolved.descriptor.code, "MTN_MOMO");
  });

  it("throws when provider is disabled", () => {
    assert.throws(
      () =>
        foundation.adapterResolver.resolve({
          providerCode: "MTN_MOMO",
          country: "RW",
          currency: "RWF",
          paymentMethod: "MOBILE_MONEY",
        }),
      ProviderDisabledError
    );
  });

  it("rejects unsupported currency for provider", () => {
    enableStripe(foundation);
    assert.throws(
      () =>
        foundation.adapterResolver.resolve({
          providerCode: "STRIPE",
          country: "US",
          currency: "JPY",
          paymentMethod: "CARD",
        }),
      ProviderCurrencyNotSupportedError
    );
  });

  it("lists available adapters filtered by currency", () => {
    enableStripe(foundation);
    const available = foundation.adapterResolver.listAvailable({
      country: "US",
      currency: "USD",
      paymentMethod: "CARD",
    });
    assert.ok(available.some((entry) => entry.descriptor.code === "STRIPE"));
  });

  it("throws when no provider matches criteria", () => {
    assert.throws(
      () =>
        foundation.adapterResolver.resolve({
          country: "ZZ",
          currency: "ZZZ",
          paymentMethod: "MOBILE_MONEY",
        }),
      ProviderNotResolvedError
    );
  });
});
