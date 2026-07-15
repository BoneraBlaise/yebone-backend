/**
 * Audit event definitions — actor types, resource types, and actions.
 * Actions are extensible: unknown strings are allowed if they match ACTION_PATTERN.
 */
const ActorType = Object.freeze({
  BUYER: "BUYER",
  SELLER: "SELLER",
  ADMIN: "ADMIN",
  SYSTEM: "SYSTEM",
  PROVIDER: "PROVIDER",
});

const ResourceType = Object.freeze({
  PAYMENT: "PAYMENT",
  TRANSACTION: "TRANSACTION",
  WALLET: "WALLET",
  ORDER: "ORDER",
  REFUND: "REFUND",
  PAYOUT: "PAYOUT",
  ESCROW: "ESCROW",
  SUBSCRIPTION: "SUBSCRIPTION",
  USER: "USER",
  SHOP: "SHOP",
});

const AuditAction = Object.freeze({
  PAYMENT_CREATED: "PAYMENT_CREATED",
  PAYMENT_UPDATED: "PAYMENT_UPDATED",
  PAYMENT_CAPTURED: "PAYMENT_CAPTURED",
  PAYMENT_SETTLED: "PAYMENT_SETTLED",
  PAYMENT_FAILED: "PAYMENT_FAILED",
  PAYMENT_REFUNDED: "PAYMENT_REFUNDED",
  WALLET_CREDITED: "WALLET_CREDITED",
  WALLET_DEBITED: "WALLET_DEBITED",
  PAYOUT_REQUESTED: "PAYOUT_REQUESTED",
  PAYOUT_APPROVED: "PAYOUT_APPROVED",
  PAYOUT_COMPLETED: "PAYOUT_COMPLETED",
  ESCROW_HELD: "ESCROW_HELD",
  ESCROW_RELEASED: "ESCROW_RELEASED",
  ORDER_PAYMENT_COMPLETED: "ORDER_PAYMENT_COMPLETED",
  ADMIN_OVERRIDE: "ADMIN_OVERRIDE",
  SYSTEM_EVENT: "SYSTEM_EVENT",
});

const ACTION_PATTERN = /^[A-Z][A-Z0-9_]{2,127}$/;

function isKnownActorType(value) {
  return Object.values(ActorType).includes(value);
}

function isKnownResourceType(value) {
  return Object.values(ResourceType).includes(value);
}

function isValidAction(value) {
  return typeof value === "string" && ACTION_PATTERN.test(value);
}

module.exports = {
  ActorType,
  ResourceType,
  AuditAction,
  ACTION_PATTERN,
  isKnownActorType,
  isKnownResourceType,
  isValidAction,
};
