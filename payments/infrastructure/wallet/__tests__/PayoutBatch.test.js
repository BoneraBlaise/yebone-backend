const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const { PayoutBatch, PAYOUT_BATCH_STATUSES } = require("../PayoutBatch");
const InvalidPostingError = require("../../ledger/errors/InvalidPostingError");

describe("PayoutBatch", () => {
  it("creates future-ready batch model", () => {
    const batch = PayoutBatch.create({
      batchId: "batch-001",
      providerBatchReference: "FLW-BATCH-123",
      scheduledAt: "2026-07-16T09:00:00.000Z",
      status: "SCHEDULED",
      metadata: { providerCode: "FLUTTERWAVE", currency: "UGX" },
    });

    assert.equal(batch.batchId, "batch-001");
    assert.equal(batch.providerBatchReference, "FLW-BATCH-123");
    assert.equal(batch.scheduledAt, "2026-07-16T09:00:00.000Z");
    assert.equal(batch.processedAt, null);
    assert.equal(batch.status, "SCHEDULED");
    assert.equal(batch.metadata.providerCode, "FLUTTERWAVE");
    assert.equal(Object.isFrozen(batch), true);
  });

  it("supports all batch statuses", () => {
    for (const status of PAYOUT_BATCH_STATUSES) {
      const batch = PayoutBatch.create({ batchId: `batch-${status}`, status });
      assert.equal(batch.status, status);
    }
  });

  it("rejects invalid status", () => {
    assert.throws(
      () => PayoutBatch.create({ batchId: "bad", status: "UNKNOWN" }),
      InvalidPostingError
    );
  });
});
