const PaymentEngineConfig = require("./PaymentEngineConfig");
const PaymentEngineContext = require("./PaymentEngineContext");
const EngineHealthContract = require("./EngineHealthContract");
const { AuditAction, ResourceType, ActorType } = require("../audit/AuditEvent");
const PaymentTransactionStatus = require("../transactions/PaymentTransactionStatus");

/**
 * Payment Engine — single entry point for payment orchestration.
 * Coordinates idempotency, transactions, audit, and provider resolution.
 *
 * Provider execution is optional and externally composed:
 * - When `providerExecutionOrchestrator` is injected, `charge()` may delegate to
 *   `ProviderExecutionOrchestrator` and attach a filtered execution snapshot.
 * - Without an injected orchestrator, behavior remains identical to prior phases.
 * - PaymentEngine does not depend directly on runtime adapters — only on the
 *   optional orchestrator interface supplied at composition time (ADR-008).
 */
class PaymentEngine {
  constructor({
    idempotencyService,
    transactionService,
    auditService,
    providerResolver,
    featureFlags,
    config = PaymentEngineConfig,
    providerExecutionOrchestrator = null,
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
    this.providerExecutionOrchestrator = providerExecutionOrchestrator || null;
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
   * When `providerExecutionOrchestrator` is injected, optionally delegates provider
   * execution via the orchestrator (reads `ExecutionResult` success + providerResponse only).
   * Without an injected orchestrator, stops after provider resolve (prior-phase behavior).
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

  /**
   * Verify a provider transaction reference via optional orchestrator delegation.
   */
  async verify(input = {}, trace = {}) {
    this.featureFlags.assertEngineEnabled();

    const context = PaymentEngineContext.fromVerifyRequest(input, trace);
    const payload = {
      reference: context.reference,
      providerCode: context.providerCode,
    };

    return this.idempotencyService.execute(
      context.trace.idempotencyKey,
      payload,
      async () => this._executeVerify(context),
      PaymentEngineContext.toIdempotencyContext(context)
    );
  }

  /**
   * Orchestrate a payout via optional orchestrator delegation.
   */
  async payout(input = {}, trace = {}) {
    this.featureFlags.assertEngineEnabled();

    const context = PaymentEngineContext.fromPayoutRequest(input, trace);
    const payload = {
      orderId: context.orderId,
      buyerId: context.buyerId,
      amount: context.amount,
      currency: context.currency,
    };

    return this.idempotencyService.execute(
      context.trace.idempotencyKey,
      payload,
      async () => this._executePayout(context),
      PaymentEngineContext.toIdempotencyContext(context)
    );
  }

  /**
   * Orchestrate a refund via optional orchestrator delegation.
   */
  async refund(input = {}, trace = {}) {
    this.featureFlags.assertEngineEnabled();

    const context = PaymentEngineContext.fromRefundRequest(input, trace);
    const payload = {
      orderId: context.orderId,
      reference: context.reference,
      amount: context.amount,
      currency: context.currency,
    };

    return this.idempotencyService.execute(
      context.trace.idempotencyKey,
      payload,
      async () => this._executeRefund(context),
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

    const result = {
      transactionId: transaction.transactionId,
      paymentReference: transaction.paymentReference,
      status: transaction.status,
      providerCode: provider.code,
      providerEnabled: provider.enabled,
      correlationId: context.trace.correlationId,
      requestId: context.trace.requestId,
    };

    if (this.providerExecutionOrchestrator) {
      const executionResult = await this.providerExecutionOrchestrator.charge(
        {
          providerCode: provider.code,
          countryCode: context.countryCode,
          currency: context.currency,
          paymentMethod: context.paymentMethod,
          reference: transaction.paymentReference || transaction.transactionId,
          amount: context.amount,
          metadata: context.metadata,
        },
        context.trace
      );

      result.providerExecution = PaymentEngine._filterExecutionSnapshot(executionResult);
    }

    return Object.freeze(result);
  }

  async _executeVerify(context) {
    const provider = this.providerResolver.resolve({
      providerCode: context.providerCode,
      countryCode: context.countryCode,
      paymentMethod: context.paymentMethod,
    });

    const result = Object.freeze({
      reference: context.reference,
      providerCode: provider.code,
      providerEnabled: provider.enabled,
      correlationId: context.trace.correlationId,
      requestId: context.trace.requestId,
    });

    if (this.providerExecutionOrchestrator) {
      const executionResult = await this.providerExecutionOrchestrator.verify(
        {
          providerCode: provider.code,
          countryCode: context.countryCode,
          currency: context.currency,
          paymentMethod: context.paymentMethod,
          reference: context.reference,
          metadata: context.metadata,
        },
        context.trace
      );

      return Object.freeze({
        ...result,
        providerExecution: PaymentEngine._filterExecutionSnapshot(executionResult),
      });
    }

    return result;
  }

  async _executePayout(context) {
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
        operation: "PAYOUT",
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

    const result = {
      transactionId: transaction.transactionId,
      paymentReference: transaction.paymentReference,
      status: transaction.status,
      providerCode: provider.code,
      providerEnabled: provider.enabled,
      correlationId: context.trace.correlationId,
      requestId: context.trace.requestId,
    };

    if (this.providerExecutionOrchestrator) {
      const executionResult = await this.providerExecutionOrchestrator.payout(
        {
          providerCode: provider.code,
          countryCode: context.countryCode,
          currency: context.currency,
          paymentMethod: context.paymentMethod,
          reference: transaction.paymentReference || transaction.transactionId,
          amount: context.amount,
          metadata: context.metadata,
        },
        context.trace
      );

      result.providerExecution = PaymentEngine._filterExecutionSnapshot(executionResult);
    }

    return Object.freeze(result);
  }

  async _executeRefund(context) {
    const provider = this.providerResolver.resolve({
      providerCode: context.providerCode,
      countryCode: context.countryCode,
      paymentMethod: context.paymentMethod,
    });

    const result = Object.freeze({
      orderId: context.orderId,
      reference: context.reference,
      providerCode: provider.code,
      providerEnabled: provider.enabled,
      correlationId: context.trace.correlationId,
      requestId: context.trace.requestId,
    });

    if (this.providerExecutionOrchestrator) {
      const executionResult = await this.providerExecutionOrchestrator.refund(
        {
          providerCode: provider.code,
          countryCode: context.countryCode,
          currency: context.currency,
          paymentMethod: context.paymentMethod,
          reference: context.reference,
          amount: context.amount,
          metadata: context.metadata,
        },
        context.trace
      );

      return Object.freeze({
        ...result,
        providerExecution: PaymentEngine._filterExecutionSnapshot(executionResult),
      });
    }

    return result;
  }

  static _filterExecutionSnapshot(executionResult) {
    return Object.freeze({
      success: executionResult.success,
      providerResponse: executionResult.providerResponse,
      executionMode: executionResult.executionMode,
      correlationId: executionResult.correlationId,
    });
  }
}

module.exports = PaymentEngine;
