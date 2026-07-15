const PaymentEngineContext = require("../engine/PaymentEngineContext");
const { assertExecutionStage } = require("./ExecutionStage");
const PaymentExecutionDiagnostics = require("./PaymentExecutionDiagnostics");

/**
 * Immutable execution context passed through pipeline stages.
 */
class PaymentExecutionContext {
  static create(input = {}, trace = {}) {
    const engineContext = PaymentEngineContext.fromRequest(input, trace);
    return PaymentExecutionContext._freeze({
      orderId: engineContext.orderId,
      buyerId: engineContext.buyerId,
      sellerId: engineContext.sellerId,
      amount: engineContext.amount,
      currency: engineContext.currency,
      paymentMethod: engineContext.paymentMethod,
      providerCode: engineContext.providerCode,
      countryCode: engineContext.countryCode,
      paymentReference: engineContext.paymentReference,
      metadata: { ...engineContext.metadata },
      trace: { ...engineContext.trace },
      currentStage: null,
      transaction: null,
      commissionBreakdown: null,
      ledgerTransactions: [],
      walletProjection: null,
      auditRecord: null,
      eventId: null,
      completedStages: [],
    });
  }

  static advance(context, stage, patch = {}) {
    assertExecutionStage(stage);

    const completedStages = [...context.completedStages, stage];
    const mergedTrace = patch.trace ? { ...context.trace, ...patch.trace } : context.trace;

    return PaymentExecutionContext._freeze({
      ...context,
      ...patch,
      currentStage: stage,
      completedStages,
      metadata: patch.metadata ? { ...context.metadata, ...patch.metadata } : context.metadata,
      trace: PaymentExecutionDiagnostics.traceStage({ trace: mergedTrace }, stage),
      ledgerTransactions: patch.ledgerTransactions || context.ledgerTransactions,
    });
  }

  static diagnostics(context) {
    return PaymentExecutionDiagnostics.snapshot(context);
  }

  static toPayload(context) {
    return {
      orderId: context.orderId,
      buyerId: context.buyerId,
      sellerId: context.sellerId,
      amount: context.amount,
      currency: context.currency,
    };
  }

  static toIdempotencyMeta(context) {
    return {
      correlationId: context.trace.correlationId,
      requestId: context.trace.requestId,
      metadata: {
        orderId: context.orderId,
        traceId: context.trace.traceId,
        pipelineStage: context.trace.pipelineStage || null,
      },
    };
  }

  static _freeze(context) {
    return Object.freeze({
      ...context,
      metadata: Object.freeze({ ...context.metadata }),
      trace: Object.freeze({ ...context.trace }),
      completedStages: Object.freeze([...context.completedStages]),
      ledgerTransactions: Object.freeze([...(context.ledgerTransactions || [])]),
    });
  }
}

module.exports = PaymentExecutionContext;
