const LedgerJournal = require("./LedgerJournal");
const LedgerTransaction = require("./LedgerTransaction");
const LedgerConfig = require("./LedgerConfig");
const AccountNotFoundError = require("./errors/AccountNotFoundError");
const DuplicateJournalError = require("./errors/DuplicateJournalError");
const InvalidCurrencyError = require("./errors/InvalidCurrencyError");
const InvalidPostingError = require("./errors/InvalidPostingError");
const ImmutableEntryError = require("./errors/ImmutableEntryError");

/**
 * Validates and posts immutable journal entries.
 * No updates — reverse entries only.
 */
class LedgerPostingEngine {
  constructor({ chartOfAccounts, store, config = LedgerConfig }) {
    if (!chartOfAccounts) {
      throw new Error("LedgerPostingEngine requires chartOfAccounts");
    }
    if (!store) {
      throw new Error("LedgerPostingEngine requires store");
    }
    this.chartOfAccounts = chartOfAccounts;
    this.store = store;
    this.config = config;
  }

  post(input = {}) {
    const journal = input.journal || LedgerJournal.create(input);
    this._assertNotDuplicate(journal.journalId);
    this._validateAccounts(journal);
    this._validateCurrency(journal);
    LedgerJournal.validate(journal);

    const transaction = LedgerTransaction.create({ journal });
    this.store.journals.push(Object.freeze({ ...journal }));
    for (const entry of journal.entries) {
      this.store.entries.push(entry);
    }
    this.store.transactions.push(transaction);
    this.store.postedJournalIds.add(journal.journalId);

    return transaction;
  }

  reverse(originalJournalId, options = {}) {
    const original = this.store.journals.find((j) => j.journalId === originalJournalId);
    if (!original) {
      throw new InvalidPostingError(`Cannot reverse unknown journal: ${originalJournalId}`);
    }

    const reversalJournal = LedgerJournal.createReversal(original, options);
    return this.post({ journal: reversalJournal });
  }

  assertImmutable() {
    throw new ImmutableEntryError();
  }

  _assertNotDuplicate(journalId) {
    if (this.store.postedJournalIds.has(journalId)) {
      throw new DuplicateJournalError(journalId);
    }
  }

  _validateAccounts(journal) {
    for (const entry of journal.entries) {
      const account = this.chartOfAccounts.getById(entry.accountId);
      if (!account) {
        throw new AccountNotFoundError(entry.accountId);
      }
      if (account.status !== "ACTIVE") {
        throw new InvalidPostingError(`Account is not active: ${account.code}`, {
          accountId: account.id,
          status: account.status,
        });
      }
    }
  }

  _validateCurrency(journal) {
    if (!this.config.supportedCurrencies.includes(journal.currency)) {
      throw new InvalidCurrencyError(journal.currency, this.config.supportedCurrencies);
    }

    for (const entry of journal.entries) {
      if (entry.currency !== journal.currency) {
        throw new InvalidPostingError("Entry currency must match journal currency");
      }
      const account = this.chartOfAccounts.getById(entry.accountId);
      if (account && account.currency !== entry.currency) {
        throw new InvalidPostingError(
          `Entry currency ${entry.currency} does not match account currency ${account.currency}`,
          { accountId: account.id, accountCode: account.code }
        );
      }
    }
  }
}

module.exports = LedgerPostingEngine;
