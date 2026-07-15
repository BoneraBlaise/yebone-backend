const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const PaymentEngineContext = require("../PaymentEngineContext");

describe("PaymentEngineContext", () => {
  it("normalizes charge input and trace fields", () => {
    const context = PaymentEngineContext.fromRequest(
      {
        orderId: "ord-1",
        buyerId: "buyer-1",
        amount: 1500,
        paymentMethod: "mobile_money",
        countryCode: "rw",
      },
      {
        correlationId: "corr-1",
        requestId: "req-1",
        traceId: "trace-1",
        idempotencyKey: "key-1",
      }
    );

    assert.equal(context.orderId, "ord-1");
    assert.equal(context.currency, "RWF");
    assert.equal(context.paymentMethod, "MOBILE_MONEY");
    assert.equal(context.countryCode, "RW");
    assert.equal(context.trace.correlationId, "corr-1");
    assert.equal(context.trace.requestId, "req-1");
  });

  it("maps to idempotency and transaction inputs", () => {
    const context = PaymentEngineContext.fromRequest({
      orderId: "ord-2",
      buyerId: "buyer-2",
      amount: 2000,
      paymentReference: "pay-ref",
    });

    const idem = PaymentEngineContext.toIdempotencyContext(context);
    assert.equal(idem.correlationId, context.trace.correlationId);
    assert.equal(idem.paymentReference, "pay-ref");

    const txn = PaymentEngineContext.toTransactionInput(context);
    assert.equal(txn.orderId, "ord-2");
    assert.equal(txn.metadata.correlationId, context.trace.correlationId);
  });

  it("rejects invalid amount", () => {
    assert.throws(
      () =>
        PaymentEngineContext.fromRequest({
          orderId: "ord-3",
          buyerId: "buyer-3",
          amount: -1,
        }),
      /amount must be a non-negative number/
    );
  });
});
