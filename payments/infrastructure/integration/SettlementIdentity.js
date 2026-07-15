const crypto = require("crypto");
const TransactionConfig = require("../transactions/TransactionConfig");

/**
 * Deterministic settlement identifiers derived from idempotency key.
 * Ensures retries for the same logical payment resolve the same transaction and journals.
 */
class SettlementIdentity {
  static deriveTransactionId(idempotencyKey) {
    const normalized = String(idempotencyKey || "").trim();
    if (!normalized) {
      throw new Error("idempotencyKey is required to derive settlement transaction id");
    }

    const digest = crypto.createHash("sha256").update(normalized).digest("hex").slice(0, 24);
    return `${TransactionConfig.transactionIdPrefix}_settle_${digest}`;
  }

  static fundJournalId(transactionId) {
    return `fund-${transactionId}`;
  }

  static releaseJournalId(transactionId) {
    return `release-${transactionId}`;
  }
}

module.exports = SettlementIdentity;
