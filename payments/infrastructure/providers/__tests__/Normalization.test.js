const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const ProviderRequest = require("../models/ProviderRequest");
const ProviderResponse = require("../models/ProviderResponse");
const ProviderError = require("../models/ProviderError");

describe("Provider request/response normalization", () => {
  it("creates immutable ProviderRequest with normalized fields", () => {
    const request = ProviderRequest.create({
      providerCode: " mtn_momo ",
      countryCode: "rw",
      currency: "rwf",
      paymentMethod: "mobile_money",
      amount: "1500",
      reference: "order-1",
      metadata: { buyerId: "b1" },
    });

    assert.equal(request.providerCode, "MTN_MOMO");
    assert.equal(request.country, "RW");
    assert.equal(request.currency, "RWF");
    assert.equal(request.paymentMethod, "MOBILE_MONEY");
    assert.equal(request.amount, 1500);
    assert.equal(Object.isFrozen(request), true);
    assert.equal(Object.isFrozen(request.metadata), true);
  });

  it("creates immutable mock ProviderResponse", () => {
    const response = ProviderResponse.mock({
      providerCode: "STRIPE",
      operation: "charge",
      reference: "pay-1",
      amount: 100,
      currency: "USD",
    });

    assert.equal(response.success, true);
    assert.equal(response.mock, true);
    assert.equal(response.providerCode, "STRIPE");
    assert.match(response.externalReference, /^mock_stripe_charge_pay-1$/);
    assert.equal(Object.isFrozen(response), true);
  });

  it("serializes ProviderError to normalized JSON", () => {
    const error = new ProviderError("Mock failure", {
      code: "MOCK_ERROR",
      providerCode: "MTN_MOMO",
      operation: "charge",
      mock: true,
    });

    const json = error.toJSON();
    assert.equal(json.code, "MOCK_ERROR");
    assert.equal(json.providerCode, "MTN_MOMO");
    assert.equal(json.mock, true);
  });

  it("wraps unknown errors via ProviderError.fromUnknown", () => {
    const error = ProviderError.fromUnknown(new Error("network"), {
      providerCode: "FLUTTERWAVE",
      operation: "refund",
    });
    assert.equal(error.providerCode, "FLUTTERWAVE");
    assert.equal(error.operation, "refund");
  });
});
