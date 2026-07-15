const PaymentExecutionContext = require("./PaymentExecutionContext");
const PaymentExecutionResult = require("./PaymentExecutionResult");
const PaymentModuleBridge = require("./PaymentModuleBridge");
const IntegrationDependencyError = require("./errors/IntegrationDependencyError");
const { ExecutionStage } = require("./ExecutionStage");

/**
 * Single entry point composing Modules 1–7 into one settlement execution flow.
 * Coordination only — no provider API, webhooks, or external HTTP.
 */
class PaymentIntegrationGate {
  constructor({ deps, pipeline }) {
    if (!deps || !pipeline) {
      throw new Error("PaymentIntegrationGate requires deps and pipeline");
    }
    this.deps = deps;
    this.pipeline = pipeline;
    PaymentModuleBridge.assertIsolated(deps);
    this._validateDependencies();
  }

  async execute(input = {}, trace = {}) {
    let context = PaymentExecutionContext.create(input, trace);
    context = await this.pipeline.runEngineStage(context);

    return this.deps.idempotencyService.execute(
      context.trace.idempotencyKey,
      PaymentExecutionContext.toPayload(context),
      async () => {
        let settled = PaymentExecutionContext.advance(context, ExecutionStage.IDEMPOTENCY);
        settled = await this.pipeline.runSettlementStages(settled);
        settled = PaymentExecutionContext.advance(settled, ExecutionStage.COMPLETE);
        return PaymentExecutionResult.create(settled);
      },
      PaymentExecutionContext.toIdempotencyMeta(context)
    );
  }

  health() {
    const IntegrationHealthContract = require("./IntegrationHealthContract");
    return IntegrationHealthContract.build(this.deps);
  }

  _validateDependencies() {
    const missing = [];

    const requiredMethods = [
      ["engine", "health"],
      ["idempotencyService", "execute"],
      ["transactionService", "createTransaction"],
      ["transactionService", "getTransaction"],
      ["transactionService", "transitionStatus"],
      ["commissionEngine", "calculate"],
      ["commissionEngine", "postEscrowRelease"],
      ["walletService", "project"],
      ["walletService", "create"],
      ["walletService", "list"],
      ["auditService", "record"],
      ["eventBus", "publish"],
    ];

    for (const [key, method] of requiredMethods) {
      const target = this.deps[key];
      if (!target || typeof target[method] !== "function") {
        missing.push(`${key}.${method}`);
      }
    }

    const ledgerEngine = this.deps.ledgerFoundation?.engine;
    if (!ledgerEngine || typeof ledgerEngine.post !== "function") {
      missing.push("ledgerFoundation.engine.post");
    }

    if (missing.length) {
      throw new IntegrationDependencyError("Integration gate dependencies are incomplete", {
        missing,
      });
    }
  }
}

module.exports = PaymentIntegrationGate;
