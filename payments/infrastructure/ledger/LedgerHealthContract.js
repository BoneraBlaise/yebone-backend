const LedgerConfig = require("./LedgerConfig");
const LedgerJournal = require("./LedgerJournal");

/**
 * Builds the ledger self-diagnostic health report.
 * No external calls — internal state validation only.
 */
class LedgerHealthContract {
  static build(engine) {
    const accounts = engine.chartOfAccounts?.count?.() ?? 0;
    const journals = engine.store?.journals?.length ?? 0;
    const entries = engine.store?.entries ?? [];
    const balanced = LedgerHealthContract._isBalanced(entries);

    const healthy = accounts > 0 && balanced;

    return Object.freeze({
      healthy,
      accounts,
      journals,
      entries: entries.length,
      balanced,
      version: engine.config?.version || LedgerConfig.version,
      checkedAt: new Date().toISOString(),
    });
  }

  static _isBalanced(entries) {
    if (!entries.length) {
      return true;
    }

    try {
      LedgerJournal.assertBalanced("health-check", entries);
      return true;
    } catch {
      return false;
    }
  }
}

module.exports = LedgerHealthContract;
