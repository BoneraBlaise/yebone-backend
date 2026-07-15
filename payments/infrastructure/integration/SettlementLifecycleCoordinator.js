const PaymentTransactionStatus = require("../transactions/PaymentTransactionStatus");
const SettlementLifecycleError = require("./errors/SettlementLifecycleError");

const S = PaymentTransactionStatus;

/**
 * Synchronizes TransactionService lifecycle with ledger, audit, and events.
 * Settlement is not complete for audit/events until status is SETTLED.
 */
class SettlementLifecycleCoordinator {
  static async advanceToCaptured(transactionService, transaction, context = {}) {
    let current = transaction;
    const meta = SettlementLifecycleCoordinator._transitionMeta(context);

    if (current.status === S.CAPTURED || current.status === S.SETTLED) {
      return current;
    }

    if (current.status === S.CREATED) {
      current = await transactionService.transitionStatus(
        current.transactionId,
        S.AUTHORIZED,
        meta
      );
    }

    if (current.status === S.AUTHORIZED) {
      current = await transactionService.transitionStatus(
        current.transactionId,
        S.CAPTURED,
        meta
      );
    }

    if (current.status !== S.CAPTURED && current.status !== S.SETTLED) {
      throw new SettlementLifecycleError(
        `Transaction must reach CAPTURED before ledger posting, got ${current.status}`,
        { transactionId: current.transactionId, status: current.status }
      );
    }

    return current;
  }

  static async advanceToSettled(transactionService, transaction, context = {}) {
    let current = transaction;
    const meta = SettlementLifecycleCoordinator._transitionMeta(context);

    if (current.status === S.SETTLED) {
      return current;
    }

    if (current.status === S.CAPTURED) {
      current = await transactionService.transitionStatus(
        current.transactionId,
        S.SETTLED,
        meta
      );
    }

    if (current.status !== S.SETTLED) {
      throw new SettlementLifecycleError(
        `Transaction must reach SETTLED before audit/events, got ${current.status}`,
        { transactionId: current.transactionId, status: current.status }
      );
    }

    return current;
  }

  static assertReadyForAudit(transaction) {
    if (!transaction || transaction.status !== S.SETTLED) {
      throw new SettlementLifecycleError(
        "Audit and events require transaction status SETTLED",
        { transactionId: transaction?.transactionId, status: transaction?.status }
      );
    }
  }

  static _transitionMeta(context) {
    return {
      metadata: {
        correlationId: context.trace?.correlationId,
        requestId: context.trace?.requestId,
        idempotencyKey: context.trace?.idempotencyKey,
      },
    };
  }
}

module.exports = SettlementLifecycleCoordinator;
