const { randomUUID } = require("crypto");
const LedgerConfig = require("./LedgerConfig");
const InvalidPostingError = require("./errors/InvalidPostingError");

/**
 * Single debit or credit line within a journal.
 * Entries are immutable once posted.
 */
class LedgerEntry {
  static create(input = {}) {
    const debit = LedgerEntry._normalizeAmount(input.debit);
    const credit = LedgerEntry._normalizeAmount(input.credit);

    const entry = {
      entryId: input.entryId || randomUUID(),
      journalId: input.journalId,
      accountId: input.accountId,
      debit,
      credit,
      currency: input.currency || LedgerConfig.defaultCurrency,
      reference: input.reference || null,
      correlationId: input.correlationId || null,
      requestId: input.requestId || null,
      metadata: input.metadata && typeof input.metadata === "object" ? { ...input.metadata } : {},
      timestamp: input.timestamp || new Date().toISOString(),
    };

    LedgerEntry.validate(entry);
    return Object.freeze(entry);
  }

  static validate(entry) {
    if (!entry || typeof entry !== "object") {
      throw new InvalidPostingError("Entry must be an object");
    }

    if (!entry.journalId) {
      throw new InvalidPostingError("Entry journalId is required");
    }

    if (!entry.accountId) {
      throw new InvalidPostingError("Entry accountId is required");
    }

    if (entry.debit < 0 || entry.credit < 0) {
      throw new InvalidPostingError("Debit and credit amounts must be non-negative");
    }

    if (entry.debit > 0 && entry.credit > 0) {
      throw new InvalidPostingError("Entry cannot have both debit and credit");
    }

    if (entry.debit === 0 && entry.credit === 0) {
      throw new InvalidPostingError("Entry must have a debit or credit amount");
    }

    if (!LedgerConfig.supportedCurrencies.includes(entry.currency)) {
      throw new InvalidPostingError(`Unsupported entry currency: ${entry.currency}`);
    }

    return true;
  }

  static _normalizeAmount(value) {
    const amount = Number(value || 0);
    if (!Number.isFinite(amount)) {
      throw new InvalidPostingError("Amount must be a finite number");
    }
    return Number(amount.toFixed(LedgerConfig.decimalPlaces));
  }
}

module.exports = LedgerEntry;
