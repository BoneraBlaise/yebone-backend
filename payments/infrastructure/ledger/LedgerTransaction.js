const { randomUUID } = require("crypto");
const InvalidPostingError = require("./errors/InvalidPostingError");

/**
 * Posted ledger transaction wrapping an immutable journal.
 */
class LedgerTransaction {
  static create(input = {}) {
    if (!input.journal) {
      throw new InvalidPostingError("LedgerTransaction requires a journal");
    }

    const transaction = {
      transactionId: input.transactionId || randomUUID(),
      journalId: input.journal.journalId,
      journal: input.journal,
      postedAt: input.postedAt || new Date().toISOString(),
      status: input.status || "POSTED",
      metadata: input.metadata && typeof input.metadata === "object" ? { ...input.metadata } : {},
    };

    LedgerTransaction.validate(transaction);
    return Object.freeze(transaction);
  }

  static validate(transaction) {
    if (!transaction || typeof transaction !== "object") {
      throw new InvalidPostingError("Transaction must be an object");
    }

    if (!transaction.journalId) {
      throw new InvalidPostingError("Transaction journalId is required");
    }

    if (!transaction.journal) {
      throw new InvalidPostingError("Transaction journal is required");
    }

    if (!["POSTED", "REVERSED"].includes(transaction.status)) {
      throw new InvalidPostingError(`Invalid transaction status: ${transaction.status}`);
    }

    return true;
  }
}

module.exports = LedgerTransaction;
