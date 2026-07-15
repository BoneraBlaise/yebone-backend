const LedgerConfig = require("./LedgerConfig");
const { ChartOfAccounts } = require("./ChartOfAccounts");
const LedgerBalanceCalculator = require("./LedgerBalanceCalculator");
const LedgerPostingEngine = require("./LedgerPostingEngine");
const LedgerEngine = require("./LedgerEngine");

function createLedgerStore() {
  return {
    journals: [],
    entries: [],
    transactions: [],
    postedJournalIds: new Set(),
  };
}

/**
 * Factory for wiring Module 6 Ledger Foundation via DI.
 * Not auto-wired into PaymentModule.
 */
function createLedgerFoundation(options = {}) {
  const config = options.config || LedgerConfig;
  const store = options.store || createLedgerStore();
  const chartOfAccounts = options.chartOfAccounts || ChartOfAccounts.createDefault({
    currency: config.defaultCurrency,
  });

  const getEntries = () => store.entries;

  const balanceCalculator = options.balanceCalculator
    || new LedgerBalanceCalculator({ chartOfAccounts, getEntries });

  const postingEngine = options.postingEngine
    || new LedgerPostingEngine({ chartOfAccounts, store, config });

  const engine = options.engine
    || new LedgerEngine({
      chartOfAccounts,
      postingEngine,
      balanceCalculator,
      store,
      config,
    });

  return Object.freeze({
    engine,
    chartOfAccounts,
    postingEngine,
    balanceCalculator,
    store,
    config,
  });
}

module.exports = createLedgerFoundation;
