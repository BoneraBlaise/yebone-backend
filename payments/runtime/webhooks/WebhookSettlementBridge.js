const PaymentExecutionContext = require("../../infrastructure/integration/PaymentExecutionContext");
const { ExecutionStage } = require("../../infrastructure/integration/ExecutionStage");
const PaymentTransactionStatus = require("../../infrastructure/transactions/PaymentTransactionStatus");
const TransactionCorrelationPolicy = require("./TransactionCorrelationPolicy");

const SETTLEMENT_ELIGIBLE = new Set([
  PaymentTransactionStatus.CAPTURED,
  PaymentTransactionStatus.SETTLED,
]);

/**
 * Runs settlement pipeline stages for an existing transaction — no Integration Gate API change.
 */
class WebhookSettlementBridge {
  constructor({ pipeline, logger = null }) {
    if (!pipeline) {
      throw new Error("WebhookSettlementBridge requires pipeline");
    }
    this.pipeline = pipeline;
    this.logger = logger;
  }

  async run({ transaction, correlationChain, providerCode }) {
    if (!transaction || !SETTLEMENT_ELIGIBLE.has(transaction.status)) {
      return Object.freeze({
        settlementExecuted: false,
        ledgerEntryIds: [],
        auditId: null,
        correlationChain,
        transaction,
      });
    }

    const trace = TransactionCorrelationPolicy.toEventTrace(correlationChain);
    let context = PaymentExecutionContext.create(
      {
        orderId: transaction.orderId,
        buyerId: transaction.buyerId,
        sellerId: transaction.sellerId,
        amount: transaction.amount,
        currency: transaction.currency,
        providerCode: providerCode || transaction.providerCode,
        paymentReference: transaction.paymentReference,
        metadata: {
          ...(transaction.metadata || {}),
          webhookSettlement: true,
          providerEventId: correlationChain.providerEventId,
        },
      },
      {
        correlationId: trace.correlationId,
        requestId: trace.requestId,
        idempotencyKey: `webhook-settlement:${transaction.transactionId}:${correlationChain.providerEventId || trace.correlationId}`,
      }
    );

    context = PaymentExecutionContext.advance(context, ExecutionStage.TRANSACTION, {
      transaction,
    });

    const stages = [
      [ExecutionStage.COMMISSION, (ctx) => this.pipeline._calculateCommission(ctx)],
      [ExecutionStage.LEDGER, (ctx) => this.pipeline._postLedger(ctx)],
      [ExecutionStage.WALLET, (ctx) => this.pipeline._projectWallet(ctx)],
      [ExecutionStage.AUDIT, (ctx) => this.pipeline._recordAudit(ctx)],
      [ExecutionStage.EVENTS, (ctx) => this.pipeline._publishEvent(ctx)],
    ];

    for (const [stage, handlerFactory] of stages) {
      context = await this.pipeline._runStage(stage, context, () => handlerFactory(context));
    }

    const ledgerEntryIds = (context.ledgerTransactions || [])
      .map((entry) => entry.journalId)
      .filter(Boolean);

    const enrichedChain = TransactionCorrelationPolicy.enrich(correlationChain, {
      transactionId: context.transaction?.transactionId || transaction.transactionId,
      ledgerEntryId: ledgerEntryIds[0] || null,
      eventId: context.eventId || correlationChain.eventId,
      auditId: context.auditRecord?.auditId || context.auditRecord?.id || correlationChain.auditId,
    });

    this.logger?.info("Webhook settlement bridge completed", TransactionCorrelationPolicy.toLogContext(enrichedChain));

    return Object.freeze({
      settlementExecuted: true,
      ledgerEntryIds,
      auditId: enrichedChain.auditId,
      correlationChain: enrichedChain,
      transaction: context.transaction || transaction,
      eventId: context.eventId || null,
    });
  }
}

module.exports = WebhookSettlementBridge;
