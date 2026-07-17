const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const WebhookReconciliationResult = require("../webhooks/WebhookReconciliationResult");

describe("WebhookReconciliationResult", () => {
  it("creates frozen canonical result", () => {
    const result = WebhookReconciliationResult.create({
      accepted: true,
      verified: true,
      reconciled: true,
      correlationId: "corr-1",
      transactionId: "txn-1",
      currentStatus: "CAPTURED",
    });

    assert.equal(result.accepted, true);
    assert.equal(result.correlationId, "corr-1");
    assert.equal(Object.isFrozen(result), true);
  });

  it("maps duplicate results with duplicate flag", () => {
    const cached = WebhookReconciliationResult.create({
      accepted: true,
      verified: true,
      reconciled: true,
      transactionId: "txn-1",
      correlationId: "corr-1",
    });
    const duplicate = WebhookReconciliationResult.duplicate({
      cached,
      correlationId: "corr-1",
    });
    assert.equal(duplicate.duplicate, true);
    assert.equal(duplicate.transactionId, "txn-1");
  });

  it("derives HTTP status for duplicate and replay", () => {
    assert.equal(
      WebhookReconciliationResult.httpStatus(
        WebhookReconciliationResult.create({ duplicate: true })
      ),
      200
    );
    assert.equal(
      WebhookReconciliationResult.httpStatus(
        WebhookReconciliationResult.replayRejected({ correlationId: "c1" })
      ),
      202
    );
  });
});
