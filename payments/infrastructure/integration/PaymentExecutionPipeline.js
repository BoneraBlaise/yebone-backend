const PaymentEngineContext = require("../engine/PaymentEngineContext");
const PaymentExecutionContext = require("./PaymentExecutionContext");
const { ExecutionStage } = require("./ExecutionStage");
const PipelineExecutionError = require("./errors/PipelineExecutionError");
const SettlementRetryGuard = require("./SettlementRetryGuard");
const SettlementLifecycleCoordinator = require("./SettlementLifecycleCoordinator");
const SettlementIdentity = require("./SettlementIdentity");
const { AuditAction, ResourceType, ActorType } = require("../audit/AuditEvent");
const PaymentTransactionStatus = require("../transactions/PaymentTransactionStatus");
const { EventTypes } = require("../events");

/**
 * Sequential coordinator for Modules 1–7. No business logic — delegates only.
 */
class PaymentExecutionPipeline {
  constructor(deps) {
    if (!deps) {
      throw new Error("PaymentExecutionPipeline requires deps");
    }
    this.deps = deps;
  }

  async runEngineStage(context) {
    this.deps.engine.featureFlags.assertEngineEnabled();
    return this._runStage(ExecutionStage.ENGINE, context, async () => {
      const health = this.deps.engine.health();
      if (!health.healthy) {
        throw new Error("Payment engine dependencies are not ready");
      }
      return {};
    });
  }

  async runSettlementStages(context) {
    let current = context;
    current = await this._runStage(ExecutionStage.TRANSACTION, current, () =>
      this._createTransaction(current)
    );
    current = await this._runStage(ExecutionStage.COMMISSION, current, () =>
      this._calculateCommission(current)
    );
    current = await this._runStage(ExecutionStage.LEDGER, current, () => this._postLedger(current));
    current = await this._runStage(ExecutionStage.WALLET, current, () => this._projectWallet(current));
    current = await this._runStage(ExecutionStage.AUDIT, current, () => this._recordAudit(current));
    current = await this._runStage(ExecutionStage.EVENTS, current, () => this._publishEvent(current));
    return current;
  }

  async _createTransaction(context) {
    const input = PaymentEngineContext.toTransactionInput(context);
    const resolved = await SettlementRetryGuard.resolveOrCreateTransaction(
      this.deps.transactionService,
      context,
      input
    );
    return { transaction: resolved.transaction };
  }

  async _calculateCommission(context) {
    const currency = this.deps.ledgerFoundation.config.defaultCurrency;
    const commissionBreakdown = this.deps.commissionEngine.calculate({
      grossAmount: context.amount,
      currency,
      metadata: context.metadata,
    });
    return { commissionBreakdown };
  }

  async _postLedger(context) {
    let transaction = await SettlementLifecycleCoordinator.advanceToCaptured(
      this.deps.transactionService,
      context.transaction,
      context
    );

    const posted = SettlementRetryGuard.resolveOrPostLedger(this.deps, { ...context, transaction }, () => {
      const { ledgerFoundation, commissionEngine } = this.deps;
      const currency = ledgerFoundation.config.defaultCurrency;
      const chart = ledgerFoundation.chartOfAccounts;
      const cash = chart.getByCode("CASH");
      const escrow = chart.getByCode("MARKETPLACE_ESCROW");
      const transactionId = transaction.transactionId;

      const fundJournal = ledgerFoundation.engine.post({
        journalId: SettlementIdentity.fundJournalId(transactionId),
        correlationId: context.trace.correlationId,
        requestId: context.trace.requestId,
        currency,
        sellerId: context.sellerId,
        buyerId: context.buyerId,
        description: "Buyer payment funding escrow",
        entries: [
          { accountId: cash.id, debit: context.amount, credit: 0 },
          { accountId: escrow.id, debit: 0, credit: context.amount },
        ],
      });

      const release = commissionEngine.postEscrowRelease(
        {
          grossAmount: context.amount,
          currency,
          metadata: context.metadata,
        },
        ledgerFoundation,
        {
          journalId: SettlementIdentity.releaseJournalId(transactionId),
          correlationId: context.trace.correlationId,
          requestId: context.trace.requestId,
          sellerId: context.sellerId,
          buyerId: context.buyerId,
        }
      );

      return Object.freeze({
        fundJournal,
        releaseJournal: release.transaction,
        commissionBreakdown: release.breakdown,
        replayed: false,
      });
    });

    transaction = await SettlementLifecycleCoordinator.advanceToSettled(
      this.deps.transactionService,
      transaction,
      context
    );

    return {
      transaction,
      commissionBreakdown: posted.commissionBreakdown || context.commissionBreakdown,
      ledgerTransactions: [posted.fundJournal, posted.releaseJournal],
    };
  }

  async _projectWallet(context) {
    SettlementLifecycleCoordinator.assertReadyForAudit(context.transaction);

    if (!context.sellerId) {
      throw new Error("sellerId is required for wallet projection");
    }

    const existing = this.deps.walletService
      .list()
      .find((entry) => entry.ownerId === context.sellerId && entry.type === "SELLER");

    const wallet = existing || this.deps.walletService.create({
      ownerId: context.sellerId,
      type: "SELLER",
    });

    const walletProjection = this.deps.walletService.project(wallet.walletId);
    return { walletProjection };
  }

  async _recordAudit(context) {
    SettlementLifecycleCoordinator.assertReadyForAudit(context.transaction);

    const auditRecord = await this.deps.auditService.record({
      action: AuditAction.PAYMENT_SETTLED,
      actorId: context.buyerId,
      actorType: ActorType.BUYER,
      resourceType: ResourceType.TRANSACTION,
      resourceId: context.transaction.transactionId,
      after: {
        status: PaymentTransactionStatus.SETTLED,
        amount: context.amount,
        currency: context.currency,
        orderId: context.orderId,
        netSellerAmount: context.commissionBreakdown?.netSellerAmount,
        platformCommission: context.commissionBreakdown?.platformCommission,
      },
      context: {
        correlationId: context.trace.correlationId,
        requestId: context.trace.requestId,
      },
      metadata: {
        traceId: context.trace.traceId,
        pipelineStage: context.trace.pipelineStage,
        ledgerJournalIds: context.ledgerTransactions.map((tx) => tx.journalId),
        walletBalance: context.walletProjection?.balance?.total,
      },
    });

    return { auditRecord };
  }

  async _publishEvent(context) {
    SettlementLifecycleCoordinator.assertReadyForAudit(context.transaction);

    const eventId = await this.deps.eventBus.publish({
      eventType: EventTypes.PAYMENT_SETTLED,
      aggregateId: context.transaction.transactionId,
      correlationId: context.trace.correlationId,
      requestId: context.trace.requestId,
      payload: {
        transactionId: context.transaction.transactionId,
        orderId: context.orderId,
        buyerId: context.buyerId,
        sellerId: context.sellerId,
        amount: context.amount,
        currency: context.currency,
        status: PaymentTransactionStatus.SETTLED,
        commissionBreakdown: context.commissionBreakdown,
      },
      metadata: {
        traceId: context.trace.traceId,
        pipelineStage: context.trace.pipelineStage,
        auditId: context.auditRecord?.auditId,
      },
    });

    return { eventId };
  }

  async _runStage(stage, context, handler) {
    try {
      const patch = await handler(context);
      return PaymentExecutionContext.advance(context, stage, patch);
    } catch (error) {
      if (error instanceof PipelineExecutionError) {
        throw error;
      }
      throw PipelineExecutionError.fromStageFailure(stage, error, context);
    }
  }
}

module.exports = PaymentExecutionPipeline;
