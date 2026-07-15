const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const WebhookVerificationInterface = require("../WebhookVerificationInterface");
const WebhookVerificationContract = require("../WebhookVerificationContract");
const { createProviderFoundation, enableMtn } = require("./testHelpers");

describe("WebhookVerificationInterface", () => {
  it("defines verifyWebhook and verifySignature contract methods", () => {
    const contract = WebhookVerificationInterface.createContract();
    assert.deepEqual(contract.methods, ["verifyWebhook", "verifySignature"]);
    assert.equal(WebhookVerificationContract.isCryptographyImplemented(), false);
  });

  it("asserts skeleton adapters implement webhook verification methods", () => {
    const foundation = createProviderFoundation();
    const adapter = foundation.adapterRegistry.getAdapter("STRIPE");
    assert.equal(WebhookVerificationInterface.assertImplementation(adapter, "STRIPE"), true);
  });

  it("returns mock verifyWebhook result without cryptography", async () => {
    const foundation = createProviderFoundation();
    const adapter = foundation.adapterRegistry.getAdapter("FLUTTERWAVE");
    const result = await adapter.verifyWebhook({
      reference: "evt-123",
      payload: { event: "charge.completed" },
    });

    assert.equal(result.verified, false);
    assert.equal(result.mock, true);
    assert.equal(result.cryptographyImplemented, false);
    assert.equal(result.method, "verifyWebhook");
  });

  it("returns mock verifySignature result without cryptography", async () => {
    const foundation = createProviderFoundation();
    enableMtn(foundation);
    const adapter = foundation.adapterRegistry.getAdapter("MTN_MOMO");
    const result = await adapter.verifySignature({
      reference: "sig-123",
      metadata: { signatureHeader: "mock-header" },
    });

    assert.equal(result.verified, false);
    assert.equal(result.mock, true);
    assert.equal(result.method, "verifySignature");
    assert.equal(result.providerCode, "MTN_MOMO");
  });

  it("documents Module 10 future verification behavior", () => {
    const future = WebhookVerificationContract.describeFutureBehavior();
    assert.equal(future.module, 10);
    assert.equal(future.cryptographyImplemented, false);
    assert.equal(future.secretsRequired, true);
  });
});
