/**
 * Payment transaction lifecycle states (Module 2 foundation).
 */
const PaymentTransactionStatus = Object.freeze({
  CREATED: "CREATED",
  PENDING: "PENDING",
  AUTHORIZED: "AUTHORIZED",
  CAPTURED: "CAPTURED",
  SETTLED: "SETTLED",
  FAILED: "FAILED",
  CANCELLED: "CANCELLED",
  REFUNDED: "REFUNDED",
  PARTIALLY_REFUNDED: "PARTIALLY_REFUNDED",
  EXPIRED: "EXPIRED",
});

module.exports = PaymentTransactionStatus;
