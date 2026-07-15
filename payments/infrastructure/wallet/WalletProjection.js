const WalletConfig = require("./WalletConfig");
const WalletBalance = require("./WalletBalance");
const WalletTransaction = require("./WalletTransaction");
const { isDebitNormal } = require("../ledger/LedgerAccountType");

class WalletProjection {
  constructor({ config = WalletConfig } = {}) {
    this.config = config;
  }

  projectEntries(wallet, ledgerEngine, chartOfAccounts) {
    const mapping = this.config.ledgerAccountMap[wallet.type];
    const account = chartOfAccounts.getByCode(mapping.accountCode);
    if (!account) return [];

    return ledgerEngine
      .getEntries()
      .filter((entry) => entry.accountId === account.id)
      .filter((entry) => this._matchesOwner(entry, wallet, mapping.ownerKey))
      .sort((a, b) => a.timestamp.localeCompare(b.timestamp))
      .map((entry) => WalletTransaction.fromLedgerEntry(entry, wallet));
  }

  projectBalance(wallet, ledgerEngine, chartOfAccounts) {
    const mapping = this.config.ledgerAccountMap[wallet.type];
    const account = chartOfAccounts.getByCode(mapping.accountCode);
    const entries = ledgerEngine
      .getEntries()
      .filter((entry) => entry.accountId === account.id)
      .filter((entry) => this._matchesOwner(entry, wallet, mapping.ownerKey));

    const debitTotal = entries.reduce((sum, e) => sum + e.debit, 0);
    const creditTotal = entries.reduce((sum, e) => sum + e.credit, 0);
    const balance = isDebitNormal(account.type) ? debitTotal - creditTotal : creditTotal - debitTotal;

    return WalletBalance.create({
      walletId: wallet.walletId,
      ownerId: wallet.ownerId,
      type: wallet.type,
      currency: wallet.currency,
      available: wallet.state === "ACTIVE" ? balance : 0,
      pending: wallet.state === "ACTIVE" ? 0 : balance,
      total: balance,
      entryCount: entries.length,
    });
  }

  _matchesOwner(entry, wallet, ownerKey) {
    const metadata = entry.metadata || {};
    const owner = metadata[ownerKey] || metadata.sellerId || metadata.walletId || metadata.buyerId;
    if (owner) return owner === wallet.ownerId;
    return wallet.type === "PLATFORM";
  }
}

module.exports = WalletProjection;
