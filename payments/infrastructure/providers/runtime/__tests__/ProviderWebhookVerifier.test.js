const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const { createHmac } = require("node:crypto");
const ProviderWebhookVerifier = require("../ProviderWebhookVerifier");
const ProviderRequestSigner = require("../ProviderRequestSigner");

describe("ProviderWebhookVerifier", () => {
  const verifier = new ProviderWebhookVerifier("PAYPACK");

  it("verifies valid HMAC signature", () => {
    const payload = JSON.stringify({ ref: "txn-1", status: "successful" });
    const secret = "webhook-secret";
    const signature = createHmac("sha256", secret).update(payload).digest("hex");

    const result = verifier.verifyWebhook({ payload, secret, signature });
    assert.equal(result.verified, true);
    assert.equal(result.cryptographyImplemented, true);
    assert.equal(result.status, "VERIFIED");
  });

  it("rejects invalid signature", () => {
    const result = verifier.verifyWebhook({
      payload: { ref: "txn-1" },
      secret: "secret",
      signature: "invalid",
    });
    assert.equal(result.verified, false);
    assert.equal(result.status, "SIGNATURE_INVALID");
  });

  it("returns mock contract when secret missing", () => {
    const result = verifier.verifyWebhook({ payload: {} });
    assert.equal(result.verified, false);
    assert.equal(result.reason, "MISSING_SECRET_OR_SIGNATURE");
  });
});
