const PaymentEngineConfig = require("./PaymentEngineConfig");
const PaymentEngineContext = require("./PaymentEngineContext");
const EngineHealthContract = require("./EngineHealthContract");
const { AuditAction, ResourceType, ActorType } = require("../audit/AuditEvent");
const PaymentTransactionStatus = require("../transactions/PaymentTransactionStatus");

/**
 * Payment Engine — future single entry point for payment orchestration.
 * Coordinates idempotency, transactions, audit, and provider resolution only.
 * Does not invoke provider adapters (bootstrap foundation).
 */
class PaymentEngine {
  constructor({
    idempotencyService,
    transactionService,
    auditService,
    providerResolver,
    featureFlags,
    config = PaymentEngineConfig,
  }) {
    if (!idempotencyService) {
      throw new Error("PaymentEngine requires idempotencyService");
    }
    if (!transactionService) {
      throw new Error("PaymentEngine requires transactionService");
    }
    if (!auditService) {
      throw new Error("PaymentEngine requires auditService");
    }
    if (!providerResolver) {
      throw new Error("PaymentEngine requires providerResolver");
    }
    if (!featureFlags) {
      throw new Error("PaymentEngine requires featureFlags");
    }

    this.idempotencyService = idempotencyService;
    this.transactionService = transactionService;
    this.auditService = auditService;
    this.providerResolver = providerResolver;
    this.featureFlags = featureFlags;
    this.config = config;
  }

  /**
   * Self-diagnostic health report — internal readiness only, no external API calls.
   */
  health() {
    return EngineHealthContract.build(this);
  }

  /** @deprecated Use health() — retained for bootstrap compatibility */
  getHealth() {
    const report = this.health();
    return Object.freeze({
      engine: "payment-engine",
      enabled: report.paymentEngineEnabled,
      providers: report.featureFlags,
      ready: report.healthy && report.paymentEngineEnabled,
    });
  }

  /**
   * Orchestrate a charge request — idempotency → transaction → audit → provider resolve.
   * Provider adapters are NOT invoked at bootstrap stage.
   */
  async charge(input = {}, trace = {}) {
    this.featureFlags.assertEngineEnabled();

    const context = PaymentEngineContext.fromRequest(input, trace);
    const payload = {
      orderId: context.orderId,
      buyerId: context.buyerId,
      amount: context.amount,
      currency: context.currency,
    };

    return this.idempotencyService.execute(
      context.trace.idempotencyKey,
      payload,
      async () => this._executeCharge(context),
      PaymentEngineContext.toIdempotencyContext(context)
    );
  }

  async _executeCharge(context) {
    const transaction = await this.transactionService.createTransaction(
      PaymentEngineContext.toTransactionInput(context)
    );

    await this.auditService.record({
      action: AuditAction.PAYMENT_CREATED,
      actorId: context.buyerId,
      actorType: ActorType.BUYER,
      resourceType: ResourceType.TRANSACTION,
      resourceId: transaction.transactionId,
      after: {
        status: PaymentTransactionStatus.CREATED,
        amount: context.amount,
        currency: context.currency,
        orderId: context.orderId,
      },
      context: {
        correlationId: context.trace.correlationId,
        requestId: context.trace.requestId,
      },
      metadata: {
        traceId: context.trace.traceId,
        paymentMethod: context.paymentMethod,
        countryCode: context.countryCode,
      },
    });

    const provider = this.providerResolver.resolve({
      providerCode: context.providerCode,
      countryCode: context.countryCode,
      paymentMethod: context.paymentMethod,
    });

    return Object.freeze({
      transactionId: transaction.transactionId,
      paymentReference: transaction.paymentReference,
      status: transaction.status,
      providerCode: provider.code,
      providerEnabled: provider.enabled,
      correlationId: context.trace.correlationId,
      requestId: context.trace.requestId,
    });
  }
}

module.exports = PaymentEngine;
