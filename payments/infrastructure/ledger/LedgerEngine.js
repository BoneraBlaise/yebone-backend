const LedgerConfig = require("./LedgerConfig");
const LedgerHealthContract = require("./LedgerHealthContract");

/**
 * Central ledger orchestrator — single source of truth for all money movements.
 * In-memory foundation store; persistence wired at integration gate.
 */
class LedgerEngine {
  constructor({
    chartOfAccounts,
    postingEngine,
    balanceCalculator,
    store,
    config = LedgerConfig,
  }) {
    if (!chartOfAccounts) {
      throw new Error("LedgerEngine requires chartOfAccounts");
    }
    if (!postingEngine) {
      throw new Error("LedgerEngine requires postingEngine");
    }
    if (!balanceCalculator) {
      throw new Error("LedgerEngine requires balanceCalculator");
    }
    if (!store) {
      throw new Error("LedgerEngine requires store");
    }

    this.chartOfAccounts = chartOfAccounts;
    this.postingEngine = postingEngine;
    this.balanceCalculator = balanceCalculator;
    this.store = store;
    this.config = config;
  }

  post(input) {
    return this.postingEngine.post(input);
  }

  reverse(journalId, options = {}) {
    return this.postingEngine.reverse(journalId, options);
  }

  getJournal(journalId) {
    return this.store.journals.find((journal) => journal.journalId === journalId) || null;
  }

  getJournals() {
    return [...this.store.journals];
  }

  getEntries() {
    return [...this.store.entries];
  }

  getTransactions() {
    return [...this.store.transactions];
  }

  accountBalance(accountId, options = {}) {
    return this.balanceCalculator.accountBalance(accountId, options);
  }

  accountBalanceByCode(code, options = {}) {
    return this.balanceCalculator.accountBalanceByCode(code, options);
  }

  currentBalance(options = {}) {
    return this.balanceCalculator.currentBalance(options);
  }

  trialBalance(options = {}) {
    return this.balanceCalculator.trialBalance(options);
  }

  generalLedger(options = {}) {
    return this.balanceCalculator.generalLedger(options);
  }

  health() {
    return LedgerHealthContract.build(this);
  }

  inspect() {
    return Object.freeze({
      accounts: this.chartOfAccounts.count(),
      journals: this.store.journals.length,
      entries: this.store.entries.length,
      transactions: this.store.transactions.length,
      version: this.config.version,
    });
  }
}

module.exports = LedgerEngine;
