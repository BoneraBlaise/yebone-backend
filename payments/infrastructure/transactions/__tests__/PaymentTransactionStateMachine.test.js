const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const PaymentTransactionStateMachine = require("../PaymentTransactionStateMachine");
const PaymentTransactionStatus = require("../PaymentTransactionStatus");
const InvalidStateTransitionError = require("../../../financial/errors/InvalidStateTransitionError");

const S = PaymentTransactionStatus;

describe("PaymentTransactionStateMachine", () => {
  const sm = new PaymentTransactionStateMachine();

  it("allows CREATED -> PENDING -> AUTHORIZED -> CAPTURED -> SETTLED", () => {
    assert.equal(sm.transition(S.CREATED, S.PENDING), S.PENDING);
    assert.equal(sm.transition(S.PENDING, S.AUTHORIZED), S.AUTHORIZED);
    assert.equal(sm.transition(S.AUTHORIZED, S.CAPTURED), S.CAPTURED);
    assert.equal(sm.transition(S.CAPTURED, S.SETTLED), S.SETTLED);
  });

  it("allows CAPTURED -> PARTIALLY_REFUNDED -> REFUNDED", () => {
    assert.equal(sm.transition(S.CAPTURED, S.PARTIALLY_REFUNDED), S.PARTIALLY_REFUNDED);
    assert.equal(sm.transition(S.PARTIALLY_REFUNDED, S.REFUNDED), S.REFUNDED);
  });

  it("allows idempotent same-state transition checks", () => {
    assert.equal(sm.canTransition(S.SETTLED, S.SETTLED), true);
    assert.equal(sm.transition(S.SETTLED, S.SETTLED), S.SETTLED);
  });

  it("rejects invalid transition SETTLED -> CAPTURED", () => {
    assert.throws(
      () => sm.transition(S.SETTLED, S.CAPTURED),
      InvalidStateTransitionError
    );
  });

  it("rejects invalid transition CREATED -> SETTLED", () => {
    assert.throws(
      () => sm.transition(S.CREATED, S.SETTLED),
      InvalidStateTransitionError
    );
  });

  it("marks terminal states correctly", () => {
    assert.equal(sm.isTerminal(S.REFUNDED), true);
    assert.equal(sm.isTerminal(S.FAILED), true);
    assert.equal(sm.isTerminal(S.PENDING), false);
  });
});
