const { describe, it, beforeEach } = require("node:test");
const assert = require("node:assert/strict");
const { createTestIntegrationFoundation } = require("./testHelpers");
const PaymentExecutionContext = require("../PaymentExecutionContext");
const PaymentExecutionPipeline = require("../PaymentExecutionPipeline");
const PipelineExecutionError = require("../errors/PipelineExecutionError");
const { ExecutionStage } = require("../ExecutionStage");

describe("PaymentExecutionPipeline", () => {
  let foundation;

  beforeEach(() => {
    foundation = createTestIntegrationFoundation();
  });

  it("runs settlement stages in mandatory order", async () => {
    let context = PaymentExecutionContext.create(
      {
        orderId: "ord-pipe-1",
        buyerId: "buyer-pipe-1",
        sellerId: "seller-pipe-1",
        amount: 8000,
      },
      { correlationId: "corr-pipe-1", requestId: "req-pipe-1" }
    );

    context = await foundation.pipeline.runEngineStage(context);
    context = await foundation.pipeline.runSettlementStages(context);

    assert.deepEqual(context.completedStages, [
      ExecutionStage.ENGINE,
      ExecutionStage.TRANSACTION,
      ExecutionStage.COMMISSION,
      ExecutionStage.LEDGER,
      ExecutionStage.WALLET,
      ExecutionStage.AUDIT,
      ExecutionStage.EVENTS,
    ]);
  });

  it("stops immediately when a stage fails", async () => {
    const failingDeps = {
      ...foundation.deps,
      walletService: {
        list: () => [],
        create: () => {
          throw new Error("wallet unavailable");
        },
        project: () => {
          throw new Error("should not reach");
        },
      },
    };

    const pipeline = new PaymentExecutionPipeline(failingDeps);
    let context = PaymentExecutionContext.create(
      {
        orderId: "ord-fail",
        buyerId: "buyer-fail",
        sellerId: "seller-fail",
        amount: 3000,
      },
      { correlationId: "corr-fail", requestId: "req-fail" }
    );

    context = await pipeline.runEngineStage(context);

    await assert.rejects(
      () => pipeline.runSettlementStages(context),
      (error) => {
        assert.equal(error instanceof PipelineExecutionError, true);
        assert.equal(error.stage, ExecutionStage.WALLET);
        return true;
      }
    );
  });

  it("does not duplicate transaction creation across pipeline reruns on idempotency", async () => {
    const input = {
      orderId: "ord-idem",
      buyerId: "buyer-idem",
      sellerId: "seller-idem",
      amount: 4500,
    };
    const trace = {
      correlationId: "corr-idem",
      requestId: "req-idem",
      idempotencyKey: "pipeline-idem-key",
    };

    await foundation.gate.execute(input, trace);
    await foundation.gate.execute(input, trace);

    assert.equal(foundation.transactionRepository.store.length, 1);
  });
});
