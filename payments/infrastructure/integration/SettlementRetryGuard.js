const SettlementIdentity = require("./SettlementIdentity");
const SettlementPartialStateError = require("./errors/SettlementPartialStateError");

/**
 * Prevents duplicate transaction and ledger side effects on idempotency retry.
 * Uses deterministic ids — coordination only, no provider wiring.
 */
class SettlementRetryGuard {
  static async resolveOrCreateTransaction(transactionService, context, input) {
    const transactionId = SettlementIdentity.deriveTransactionId(context.trace.idempotencyKey);

    try {
      const existing = await transactionService.getTransaction(transactionId);
      return Object.freeze({ transaction: existing, replayed: true });
    } catch (error) {
      if (error.name !== "TransactionNotFoundError") {
        throw error;
      }
    }

    const transaction = await transactionService.createTransaction({
      ...input,
      transactionId,
    });

    return Object.freeze({ transaction, replayed: false });
  }

  static resolveOrPostLedger(deps, context, postFn) {
    const transactionId = context.transaction.transactionId;
    const fundJournalId = SettlementIdentity.fundJournalId(transactionId);
    const releaseJournalId = SettlementIdentity.releaseJournalId(transactionId);
    const store = deps.ledgerFoundation.store;

    const hasFund = store.postedJournalIds.has(fundJournalId);
    const hasRelease = store.postedJournalIds.has(releaseJournalId);

    if (hasFund && hasRelease) {
      const fundJournal = store.journals.find((entry) => entry.journalId === fundJournalId);
      const releaseJournal = store.journals.find((entry) => entry.journalId === releaseJournalId);
      return Object.freeze({
        fundJournal,
        releaseJournal,
        replayed: true,
      });
    }

    if (hasFund || hasRelease) {
      throw new SettlementPartialStateError(transactionId, {
        fundJournalId,
        releaseJournalId,
        hasFund,
        hasRelease,
      });
    }

    return postFn();
  }
}

module.exports = SettlementRetryGuard;
