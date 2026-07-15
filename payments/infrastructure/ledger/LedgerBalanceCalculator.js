const { isDebitNormal } = require("./LedgerAccountType");
const LedgerConfig = require("./LedgerConfig");

/**
 * Read-only balance calculations derived from posted entries.
 * No cached balances — all values computed on demand.
 */
class LedgerBalanceCalculator {
  constructor({ chartOfAccounts, getEntries }) {
    if (!chartOfAccounts) {
      throw new Error("LedgerBalanceCalculator requires chartOfAccounts");
    }
    if (typeof getEntries !== "function") {
      throw new Error("LedgerBalanceCalculator requires getEntries function");
    }
    this.chartOfAccounts = chartOfAccounts;
    this.getEntries = getEntries;
  }

  accountBalance(accountId, options = {}) {
    const account = this.chartOfAccounts.getById(accountId);
    if (!account) {
      return null;
    }

    const entries = this._filterEntries({ accountId, ...options });
    return this._computeBalance(account.type, entries);
  }

  accountBalanceByCode(code, options = {}) {
    const account = this.chartOfAccounts.getByCode(code);
    if (!account) {
      return null;
    }
    return this.accountBalance(account.id, options);
  }

  currentBalance(options = {}) {
    const entries = this._filterEntries(options);
    const totalDebit = this._sum(entries, "debit");
    const totalCredit = this._sum(entries, "credit");
    return {
      currency: options.currency || LedgerConfig.defaultCurrency,
      totalDebit: Number(totalDebit.toFixed(LedgerConfig.decimalPlaces)),
      totalCredit: Number(totalCredit.toFixed(LedgerConfig.decimalPlaces)),
      net: Number((totalDebit - totalCredit).toFixed(LedgerConfig.decimalPlaces)),
      entryCount: entries.length,
    };
  }

  trialBalance(options = {}) {
    const accounts = this.chartOfAccounts.list();
    const rows = accounts.map((account) => {
      const entries = this._filterEntries({ accountId: account.id, ...options });
      const debitTotal = this._sum(entries, "debit");
      const creditTotal = this._sum(entries, "credit");
      const balance = this._computeBalance(account.type, entries);

      return {
        accountId: account.id,
        code: account.code,
        name: account.name,
        type: account.type,
        currency: account.currency,
        debitTotal: Number(debitTotal.toFixed(LedgerConfig.decimalPlaces)),
        creditTotal: Number(creditTotal.toFixed(LedgerConfig.decimalPlaces)),
        balance: Number(balance.toFixed(LedgerConfig.decimalPlaces)),
        entryCount: entries.length,
      };
    });

    const totalDebit = rows.reduce((sum, row) => sum + row.debitTotal, 0);
    const totalCredit = rows.reduce((sum, row) => sum + row.creditTotal, 0);

    return Object.freeze({
      rows: Object.freeze(rows),
      totalDebit: Number(totalDebit.toFixed(LedgerConfig.decimalPlaces)),
      totalCredit: Number(totalCredit.toFixed(LedgerConfig.decimalPlaces)),
      balanced: Number(totalDebit.toFixed(LedgerConfig.decimalPlaces))
        === Number(totalCredit.toFixed(LedgerConfig.decimalPlaces)),
      generatedAt: new Date().toISOString(),
    });
  }

  generalLedger(options = {}) {
    const accounts = this.chartOfAccounts.list();
    const ledger = accounts.map((account) => {
      const entries = this._filterEntries({ accountId: account.id, ...options })
        .sort((a, b) => a.timestamp.localeCompare(b.timestamp));

      const runningBalance = [];
      let balance = 0;

      for (const entry of entries) {
        balance = isDebitNormal(account.type)
          ? balance + entry.debit - entry.credit
          : balance + entry.credit - entry.debit;

        runningBalance.push({
          ...entry,
          runningBalance: Number(balance.toFixed(LedgerConfig.decimalPlaces)),
        });
      }

      return Object.freeze({
        accountId: account.id,
        code: account.code,
        name: account.name,
        type: account.type,
        currency: account.currency,
        entries: Object.freeze(runningBalance),
        closingBalance: Number(balance.toFixed(LedgerConfig.decimalPlaces)),
      });
    });

    return Object.freeze(ledger);
  }

  _filterEntries(options = {}) {
    let entries = this.getEntries();

    if (options.currency) {
      entries = entries.filter((entry) => entry.currency === options.currency);
    }

    if (options.accountId) {
      entries = entries.filter((entry) => entry.accountId === options.accountId);
    }

    if (options.from) {
      entries = entries.filter((entry) => entry.timestamp >= options.from);
    }

    if (options.to) {
      entries = entries.filter((entry) => entry.timestamp <= options.to);
    }

    return entries;
  }

  _computeBalance(accountType, entries) {
    const debitTotal = this._sum(entries, "debit");
    const creditTotal = this._sum(entries, "credit");

    return isDebitNormal(accountType)
      ? debitTotal - creditTotal
      : creditTotal - debitTotal;
  }

  _sum(entries, field) {
    return entries.reduce((sum, entry) => sum + entry[field], 0);
  }
}

module.exports = LedgerBalanceCalculator;
