const IntegrationConfig = require("./IntegrationConfig");
const { ExecutionStage } = require("./ExecutionStage");
const PaymentExecutionDiagnostics = require("./PaymentExecutionDiagnostics");

/**
 * Final result of a successful integration gate execution.
 */
class PaymentExecutionResult {
  static create(context) {
    const result = {
      success: true,
      transactionId: context.transaction?.transactionId || null,
      correlationId: context.trace.correlationId,
      requestId: context.trace.requestId,
      commissionBreakdown: context.commissionBreakdown || null,
      ledgerJournalIds: context.ledgerTransactions.map((tx) => tx.journalId),
      walletBalance: context.walletProjection?.balance?.total ?? null,
      auditId: context.auditRecord?.auditId || null,
      eventId: context.eventId || null,
      finalStage: context.currentStage || ExecutionStage.COMPLETE,
      completedStages: [...context.completedStages],
      diagnostics: PaymentExecutionDiagnostics.snapshot(context),
      version: IntegrationConfig.version,
      completedAt: new Date().toISOString(),
    };

    return Object.freeze(result);
  }
}

module.exports = PaymentExecutionResult;
