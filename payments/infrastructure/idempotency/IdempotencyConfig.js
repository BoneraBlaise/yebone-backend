/**
 * Idempotency layer configuration defaults.
 * TTL and header names are centralized here — not scattered across services.
 */
const IdempotencyConfig = {
  /** Default record lifetime (seconds). MongoDB TTL index uses expiresAt. */
  defaultTtlSeconds: 60 * 60 * 24, // 24 hours

  /** Stale PROCESSING records older than this are eligible for cleanup (seconds). */
  staleProcessingThresholdSeconds: 60 * 15, // 15 minutes

  headers: {
    idempotencyKey: "idempotency-key",
    correlationId: "x-correlation-id",
    requestId: "x-request-id",
    paymentReference: "x-payment-reference",
  },

  recordStatus: {
    PROCESSING: "PROCESSING",
    COMPLETED: "COMPLETED",
    FAILED: "FAILED",
  },

  collectionName: "payment_idempotency_keys",
};

module.exports = IdempotencyConfig;
