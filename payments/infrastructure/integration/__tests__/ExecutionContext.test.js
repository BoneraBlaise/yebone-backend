const { describe, it, beforeEach } = require("node:test");
const assert = require("node:assert/strict");
const PaymentExecutionContext = require("../PaymentExecutionContext");
const { ExecutionStage } = require("../ExecutionStage");

describe("PaymentExecutionContext", () => {
  it("creates immutable context from input and trace", () => {
    const context = PaymentExecutionContext.create(
      {
        orderId: "ord-1",
        buyerId: "buyer-1",
        sellerId: "seller-1",
        amount: 5000,
        currency: "ugx",
      },
      {
        correlationId: "corr-fixed",
        requestId: "req-fixed",
        idempotencyKey: "idem-1",
      }
    );

    assert.equal(context.orderId, "ord-1");
    assert.equal(context.currency, "UGX");
    assert.equal(context.trace.correlationId, "corr-fixed");
    assert.equal(context.trace.idempotencyKey, "idem-1");
    assert.equal(context.completedStages.length, 0);
    assert.equal(Object.isFrozen(context), true);
    assert.equal(Object.isFrozen(context.trace), true);
  });

  it("advances context immutably per stage", () => {
    const base = PaymentExecutionContext.create({
      orderId: "ord-2",
      buyerId: "buyer-2",
      amount: 1000,
    });

    const next = PaymentExecutionContext.advance(base, ExecutionStage.TRANSACTION, {
      transaction: { transactionId: "txn-1" },
    });

    assert.equal(base.transaction, null);
    assert.equal(next.transaction.transactionId, "txn-1");
    assert.deepEqual(next.completedStages, [ExecutionStage.TRANSACTION]);
    assert.equal(next.currentStage, ExecutionStage.TRANSACTION);
    assert.equal(next.trace.pipelineStage, ExecutionStage.TRANSACTION);
    assert.notEqual(base, next);
  });

  it("rejects invalid execution stages", () => {
    const base = PaymentExecutionContext.create({
      orderId: "ord-invalid",
      buyerId: "buyer-invalid",
      amount: 100,
    });

    assert.throws(
      () => PaymentExecutionContext.advance(base, "INVALID_STAGE"),
      /Invalid execution stage/
    );
  });

  it("exposes diagnostics snapshot for tracing and monitoring", () => {
    const context = PaymentExecutionContext.advance(
      PaymentExecutionContext.create({
        orderId: "ord-diag",
        buyerId: "buyer-diag",
        amount: 1000,
      }),
      ExecutionStage.ENGINE
    );

    const diagnostics = PaymentExecutionContext.diagnostics(context);
    assert.equal(diagnostics.currentStage, ExecutionStage.ENGINE);
    assert.equal(diagnostics.progress.completed, 1);
    assert.equal(diagnostics.monitoring.stage, ExecutionStage.ENGINE);
  });

  it("exports idempotency payload and metadata helpers", () => {
    const context = PaymentExecutionContext.create(
      { orderId: "ord-3", buyerId: "buyer-3", amount: 200 },
      { correlationId: "corr-3", requestId: "req-3" }
    );

    assert.deepEqual(PaymentExecutionContext.toPayload(context), {
      orderId: "ord-3",
      buyerId: "buyer-3",
      sellerId: null,
      amount: 200,
      currency: "RWF",
    });

    assert.equal(PaymentExecutionContext.toIdempotencyMeta(context).correlationId, "corr-3");
  });
});
