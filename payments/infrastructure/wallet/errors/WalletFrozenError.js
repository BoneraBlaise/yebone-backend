class WalletFrozenError extends Error {
  constructor(walletId) {
    super(`Wallet is frozen: ${walletId}`);
    this.name = "WalletFrozenError";
    this.code = "WALLET_FROZEN";
    this.walletId = walletId;
    this.statusCode = 403;
  }
}

module.exports = WalletFrozenError;
