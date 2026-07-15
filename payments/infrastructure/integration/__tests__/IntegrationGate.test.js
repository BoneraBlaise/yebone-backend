const { describe, it, beforeEach } = require("node:test");
const assert = require("node:assert/strict");
const { createTestIntegrationFoundation } = require("./testHelpers");
const PaymentIntegrationGate = require("../PaymentIntegrationGate");
const PaymentExecutionPipeline = require("../PaymentExecutionPipeline");
const PaymentModuleBridge = require("../PaymentModuleBridge");
const IntegrationDependencyError = require("../errors/IntegrationDependencyError");
const PaymentEngineDisabledError = require("../../engine/errors/PaymentEngineDisabledError");
const { STAGE_ORDER } = require("../ExecutionStage");

describe("PaymentIntegrationGate", () => {
  let foundation;

  beforeEach(() => {
    foundation = createTestIntegrationFoundation();
  });

  it("executes full settlement flow and returns PaymentExecutionResult", async () => {
    const result = await foundation.gate.execute(
      {
        orderId: "ord-gate-1",
        buyerId: "buyer-gate-1",
        sellerId: "seller-gate-1",
        amount: 10000,
      },
      {
        correlationId: "corr-gate-1",
        requestId: "req-gate-1",
        idempotencyKey: "gate-idem-1",
      }
    );

    assert.equal(result.success, true);
    assert.equal(result.correlationId, "corr-gate-1");
    assert.ok(result.transactionId);
    assert.equal(result.completedStages.length, STAGE_ORDER.length);
  });

  it("rejects when payment engine feature flag is disabled", async () => {
    foundation.deps.featureFlags.disable("paymentEngineEnabled");

    await assert.rejects(
      () =>
        foundation.gate.execute({
          orderId: "ord-off",
          buyerId: "buyer-off",
          sellerId: "seller-off",
          amount: 1000,
        }),
      PaymentEngineDisabledError
    );
  });

  it("rejects PaymentModule injection at boundary", () => {
    assert.throws(
      () =>
        new PaymentIntegrationGate({
          deps: { ...foundation.deps, paymentModule: {} },
          pipeline: foundation.pipeline,
        }),
      IntegrationDependencyError
    );
  });

  it("documents integration boundary without PaymentModule", () => {
    const boundary = PaymentModuleBridge.getBoundary();
    assert.equal(boundary.wired, false);
    assert.equal(boundary.noProviderApi, true);
    assert.ok(boundary.forbiddenTargets.includes("PaymentModule"));
  });

  it("requires complete dependency graph at construction", () => {
    assert.throws(
      () =>
        new PaymentIntegrationGate({
          deps: { engine: foundation.deps.engine },
          pipeline: new PaymentExecutionPipeline({ engine: foundation.deps.engine }),
        }),
      IntegrationDependencyError
    );
  });
});
