const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const ProviderResponseNormalizer = require("../ProviderResponseNormalizer");

describe("ProviderResponseNormalizer", () => {
  const normalizer = new ProviderResponseNormalizer("MTN_MOMO");

  it("normalizes charge response with references and idempotency", () => {
    const response = normalizer.normalizeCharge({
      success: true,
      reference: "order-123",
      amount: 5000,
      currency: "RWF",
      idempotencyKey: "pidem_mtnmomo_abc123",
      correlationId: "corr-1",
      sandbox: true,
    });

    assert.equal(response.success, true);
    assert.equal(response.providerCode, "MTN_MOMO");
    assert.equal(response.operation, "charge");
    assert.equal(response.amount, 5000);
    assert.match(response.externalReference, /^pref_mtnmomo_provider_/);
    assert.equal(response.metadata.correlationId, "corr-1");
    assert.equal(response.metadata.sandbox, true);
  });

  it("normalizes error responses", () => {
    const error = { code: "TEST", message: "failed" };
    const response = normalizer.normalizeError({ error });
    assert.equal(response.success, false);
    assert.equal(response.error.code, "TEST");
  });
});
