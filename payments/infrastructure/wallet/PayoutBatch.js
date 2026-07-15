const { randomUUID } = require("crypto");
const InvalidPostingError = require("../ledger/errors/InvalidPostingError");

const PAYOUT_BATCH_STATUSES = Object.freeze([
  "SCHEDULED",
  "PROCESSING",
  "COMPLETED",
  "FAILED",
  "CANCELLED",
]);

/**
 * Future-ready payout batch model — no persistence or queue wiring.
 */
class PayoutBatch {
  static create(input = {}) {
    const batch = {
      batchId: input.batchId || randomUUID(),
      providerBatchReference: input.providerBatchReference || null,
      scheduledAt: input.scheduledAt || null,
      processedAt: input.processedAt || null,
      status: input.status || "SCHEDULED",
      metadata: input.metadata && typeof input.metadata === "object" ? { ...input.metadata } : {},
      createdAt: input.createdAt || new Date().toISOString(),
    };

    PayoutBatch.validate(batch);
    return Object.freeze(batch);
  }

  static validate(batch) {
    if (!batch || typeof batch !== "object") {
      throw new InvalidPostingError("PayoutBatch must be an object");
    }

    if (!batch.batchId) {
      throw new InvalidPostingError("PayoutBatch batchId is required");
    }

    if (!PAYOUT_BATCH_STATUSES.includes(batch.status)) {
      throw new InvalidPostingError(`Invalid PayoutBatch status: ${batch.status}`);
    }

    return true;
  }

  static statuses() {
    return [...PAYOUT_BATCH_STATUSES];
  }
}

module.exports = {
  PayoutBatch,
  PAYOUT_BATCH_STATUSES,
};
