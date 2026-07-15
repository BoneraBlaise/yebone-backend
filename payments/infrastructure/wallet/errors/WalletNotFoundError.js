class WalletNotFoundError extends Error {
  constructor(walletId) {
    super(`Wallet not found: ${walletId}`);
    this.name = "WalletNotFoundError";
    this.code = "WALLET_NOT_FOUND";
    this.walletId = walletId;
  }
}

module.exports = WalletNotFoundError;
