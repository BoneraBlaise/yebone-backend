class WalletLedgerBridge {
  constructor({ projection, ledgerFoundation }) {
    if (!projection) throw new Error("WalletLedgerBridge requires projection");
    if (!ledgerFoundation) throw new Error("WalletLedgerBridge requires ledgerFoundation");
    this.projection = projection;
    this.ledgerFoundation = ledgerFoundation;
  }

  get engine() {
    return this.ledgerFoundation.engine;
  }

  get chartOfAccounts() {
    return this.ledgerFoundation.chartOfAccounts;
  }

  getBalance(wallet) {
    return this.projection.projectBalance(wallet, this.engine, this.chartOfAccounts);
  }

  projectTransactions(wallet) {
    return this.projection.projectEntries(wallet, this.engine, this.chartOfAccounts);
  }
}

module.exports = WalletLedgerBridge;
