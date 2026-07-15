const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const { EventTypes, isKnownEventType, isValidEventType } = require("../EventTypes");

describe("EventTypes", () => {
  it("includes required payment domain events", () => {
    const required = [
      "PAYMENT_CREATED",
      "PAYMENT_PENDING",
      "PAYMENT_AUTHORIZED",
      "PAYMENT_CAPTURED",
      "PAYMENT_SETTLED",
      "PAYMENT_FAILED",
      "PAYMENT_CANCELLED",
      "PAYMENT_REFUNDED",
      "PAYMENT_PARTIALLY_REFUNDED",
      "ESCROW_CREATED",
      "ESCROW_RELEASED",
      "ESCROW_CANCELLED",
      "WALLET_CREDITED",
      "WALLET_DEBITED",
      "PAYOUT_REQUESTED",
      "PAYOUT_APPROVED",
      "PAYOUT_COMPLETED",
      "PAYOUT_FAILED",
      "AUDIT_RECORDED",
      "TRANSACTION_CREATED",
      "TRANSACTION_UPDATED",
    ];

    for (const type of required) {
      assert.equal(isKnownEventType(type), true, type);
      assert.equal(EventTypes[type], type);
    }
  });

  it("validates extensible event type pattern", () => {
    assert.equal(isValidEventType("CUSTOM_EVENT_V2"), true);
    assert.equal(isValidEventType("x"), false);
    assert.equal(isValidEventType(""), false);
  });
});
