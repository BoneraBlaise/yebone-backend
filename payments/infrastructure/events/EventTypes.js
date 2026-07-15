/**
 * Strongly typed payment domain event types.
 * Extensible via isValidEventType pattern.
 */
const EventTypes = Object.freeze({
  PAYMENT_CREATED: "PAYMENT_CREATED",
  PAYMENT_PENDING: "PAYMENT_PENDING",
  PAYMENT_AUTHORIZED: "PAYMENT_AUTHORIZED",
  PAYMENT_CAPTURED: "PAYMENT_CAPTURED",
  PAYMENT_SETTLED: "PAYMENT_SETTLED",
  PAYMENT_FAILED: "PAYMENT_FAILED",
  PAYMENT_CANCELLED: "PAYMENT_CANCELLED",
  PAYMENT_REFUNDED: "PAYMENT_REFUNDED",
  PAYMENT_PARTIALLY_REFUNDED: "PAYMENT_PARTIALLY_REFUNDED",
  ESCROW_CREATED: "ESCROW_CREATED",
  ESCROW_RELEASED: "ESCROW_RELEASED",
  ESCROW_CANCELLED: "ESCROW_CANCELLED",
  WALLET_CREDITED: "WALLET_CREDITED",
  WALLET_DEBITED: "WALLET_DEBITED",
  PAYOUT_REQUESTED: "PAYOUT_REQUESTED",
  PAYOUT_APPROVED: "PAYOUT_APPROVED",
  PAYOUT_COMPLETED: "PAYOUT_COMPLETED",
  PAYOUT_FAILED: "PAYOUT_FAILED",
  AUDIT_RECORDED: "AUDIT_RECORDED",
  TRANSACTION_CREATED: "TRANSACTION_CREATED",
  TRANSACTION_UPDATED: "TRANSACTION_UPDATED",
});

const EVENT_TYPE_PATTERN = /^[A-Z][A-Z0-9_]{2,127}$/;

function isKnownEventType(value) {
  return Object.values(EventTypes).includes(value);
}

function isValidEventType(value) {
  return typeof value === "string" && EVENT_TYPE_PATTERN.test(value.trim().toUpperCase());
}

function normalizeEventType(value) {
  const normalized = String(value || "").trim().toUpperCase();
  if (!isValidEventType(normalized)) {
    throw new Error(`Invalid event type: ${value}`);
  }
  return normalized;
}

module.exports = {
  EventTypes,
  EVENT_TYPE_PATTERN,
  isKnownEventType,
  isValidEventType,
  normalizeEventType,
};
