const CommissionConfig = require("./CommissionConfig");
const CommissionHealthContract = require("./CommissionHealthContract");

/**
 * Orchestrates rule resolution, calculation, and ledger journal production.
 * Ledger accessed via interface only — never modified directly.
 */
class CommissionEngine {
  constructor({
    resolver,
    calculator,
    config = CommissionConfig,
  }) {
    if (!resolver) {
      throw new Error("CommissionEngine requires resolver");
    }
    if (!calculator) {
      throw new Error("CommissionEngine requires calculator");
    }
    this.resolver = resolver;
    this.calculator = calculator;
    this.config = config;
  }

  registerRule(rule) {
    return this.resolver.register(rule);
  }

  resolve(context = {}) {
    return this.resolver.resolve(context);
  }

  calculate(context = {}) {
    const resolved = this.resolver.requireBaseRule(context);
    return this.calculator.calculate({
      grossAmount: context.grossAmount,
      resolved,
      currency: context.currency,
      metadata: context.metadata,
    });
  }

  buildEscrowReleaseJournal(breakdown, ledgerFoundation, options = {}) {
    const CommissionDistribution = require("./CommissionDistribution");
    const chartOfAccounts = ledgerFoundation.chartOfAccounts || ledgerFoundation;
    return CommissionDistribution.buildEscrowReleaseJournalInput(
      breakdown,
      chartOfAccounts,
      options
    );
  }

  postEscrowRelease(context, ledgerFoundation, options = {}) {
    const breakdown = this.calculate(context);
    const journalInput = this.buildEscrowReleaseJournal(breakdown, ledgerFoundation, options);
    const engine = ledgerFoundation.engine || ledgerFoundation;
    const transaction = engine.post(journalInput);
    return Object.freeze({ breakdown, transaction });
  }

  health() {
    return CommissionHealthContract.build(this);
  }
}

module.exports = CommissionEngine;
