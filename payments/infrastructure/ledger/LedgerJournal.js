const { randomUUID } = require("crypto");
const LedgerEntry = require("./LedgerEntry");
const LedgerConfig = require("./LedgerConfig");
const LedgerJournalMetadata = require("./LedgerJournalMetadata");
const UnbalancedJournalError = require("./errors/UnbalancedJournalError");
const InvalidPostingError = require("./errors/InvalidPostingError");

/**
 * Balanced collection of ledger entries representing one financial event.
 */
class LedgerJournal {
  static create(input = {}) {
    const journalId = input.journalId || randomUUID();
    const rawEntries = Array.isArray(input.entries) ? input.entries : [];

    if (rawEntries.length === 0) {
      throw new InvalidPostingError("Journal must contain at least one entry");
    }

    if (rawEntries.length > LedgerConfig.maxEntriesPerJournal) {
      throw new InvalidPostingError(
        `Journal exceeds max entries (${LedgerConfig.maxEntriesPerJournal})`
      );
    }

    const entries = rawEntries.map((entry) =>
      LedgerEntry.create({
        ...entry,
        journalId,
        correlationId: entry.correlationId || input.correlationId,
        requestId: entry.requestId || input.requestId,
        reference: entry.reference || input.reference,
        currency: entry.currency || input.currency,
      })
    );

    const journal = {
      journalId,
      description: input.description || null,
      reference: input.reference || null,
      correlationId: input.correlationId || null,
      requestId: input.requestId || null,
      currency: input.currency || LedgerConfig.defaultCurrency,
      entries,
      metadata: LedgerJournalMetadata.build(input),
      createdAt: input.createdAt || new Date().toISOString(),
    };

    LedgerJournal.validate(journal);
    return Object.freeze(journal);
  }

  static validate(journal) {
    if (!journal || typeof journal !== "object") {
      throw new InvalidPostingError("Journal must be an object");
    }

    if (!journal.journalId) {
      throw new InvalidPostingError("Journal journalId is required");
    }

    if (!Array.isArray(journal.entries) || journal.entries.length === 0) {
      throw new InvalidPostingError("Journal entries are required");
    }

    const currencies = new Set(journal.entries.map((entry) => entry.currency));
    if (currencies.size > 1) {
      throw new InvalidPostingError("All entries in a journal must share the same currency");
    }

    LedgerJournal.assertBalanced(journal.journalId, journal.entries);
    return true;
  }

  static assertBalanced(journalId, entries) {
    const totalDebit = entries.reduce((sum, entry) => sum + entry.debit, 0);
    const totalCredit = entries.reduce((sum, entry) => sum + entry.credit, 0);

    const roundedDebit = Number(totalDebit.toFixed(LedgerConfig.decimalPlaces));
    const roundedCredit = Number(totalCredit.toFixed(LedgerConfig.decimalPlaces));

    if (roundedDebit !== roundedCredit) {
      throw new UnbalancedJournalError(journalId, roundedDebit, roundedCredit);
    }

    return { totalDebit: roundedDebit, totalCredit: roundedCredit };
  }

  static createReversal(originalJournal, options = {}) {
    if (!originalJournal || !Array.isArray(originalJournal.entries)) {
      throw new InvalidPostingError("Original journal is required for reversal");
    }

    const journalId = options.journalId || randomUUID();
    const reversalEntries = originalJournal.entries.map((entry) =>
      LedgerEntry.create({
        journalId,
        accountId: entry.accountId,
        debit: entry.credit,
        credit: entry.debit,
        currency: entry.currency,
        reference: options.reference || `REVERSAL:${originalJournal.reference || originalJournal.journalId}`,
        correlationId: options.correlationId || originalJournal.correlationId,
        requestId: options.requestId || originalJournal.requestId,
        metadata: {
          ...entry.metadata,
          reversalOf: entry.entryId,
          originalJournalId: originalJournal.journalId,
        },
      })
    );

    return LedgerJournal.create({
      journalId,
      description: options.description || `Reversal of ${originalJournal.journalId}`,
      reference: options.reference || `REVERSAL:${originalJournal.journalId}`,
      correlationId: options.correlationId || originalJournal.correlationId,
      requestId: options.requestId || originalJournal.requestId,
      currency: originalJournal.currency,
      entries: reversalEntries,
      metadata: LedgerJournalMetadata.build({
        ...options,
        metadata: {
          ...(originalJournal.metadata || {}),
          ...(options.metadata || {}),
          reversalOf: originalJournal.journalId,
          type: "REVERSAL",
        },
      }),
    });
  }
}

module.exports = LedgerJournal;
