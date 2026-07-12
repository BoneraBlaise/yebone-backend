/**
 * Lifecycle status for payments, intents, and related records.
 */
const PaymentStatus = Object.freeze({
  PENDING: "PENDING",
  PROCESSING: "PROCESSING",
  AUTHORIZED: "AUTHORIZED",
  PAID: "PAID",
  FAILED: "FAILED",
  REFUNDED: "REFUNDED",
  CANCELLED: "CANCELLED",
  EXPIRED: "EXPIRED",
});

module.exports = PaymentStatus;
