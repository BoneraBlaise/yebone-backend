class WalletTransaction {
  static fromLedgerEntry(entry, wallet) {
    return Object.freeze({
      transactionId: entry.entryId,
      walletId: wallet.walletId,
      ownerId: wallet.ownerId,
      type: wallet.type,
      debit: entry.debit,
      credit: entry.credit,
      currency: entry.currency,
      reference: entry.reference,
      correlationId: entry.correlationId,
      journalId: entry.journalId,
      metadata: entry.metadata || {},
      timestamp: entry.timestamp,
      source: "LEDGER",
    });
  }
}

module.exports = WalletTransaction;
