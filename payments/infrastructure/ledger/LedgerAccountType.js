/**
 * Standard ledger account classification types.
 * CLEARING, ESCROW, and RESERVE extend the core accounting types for marketplace flows.
 */
const LedgerAccountType = Object.freeze({
  ASSET: "ASSET",
  LIABILITY: "LIABILITY",
  EQUITY: "EQUITY",
  REVENUE: "REVENUE",
  EXPENSE: "EXPENSE",
  CLEARING: "CLEARING",
  ESCROW: "ESCROW",
  RESERVE: "RESERVE",
});

const DEBIT_NORMAL_TYPES = new Set([
  LedgerAccountType.ASSET,
  LedgerAccountType.EXPENSE,
]);

function isDebitNormal(type) {
  return DEBIT_NORMAL_TYPES.has(type);
}

module.exports = {
  LedgerAccountType,
  DEBIT_NORMAL_TYPES,
  isDebitNormal,
};
