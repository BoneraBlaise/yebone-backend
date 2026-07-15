class InsufficientBalanceError extends Error {
  constructor(walletId, requested, available) {
    super(`Insufficient balance for wallet ${walletId}: requested=${requested} available=${available}`);
    this.name = "InsufficientBalanceError";
    this.code = "INSUFFICIENT_BALANCE";
    this.walletId = walletId;
    this.requested = requested;
    this.available = available;
    this.statusCode = 409;
  }
}

module.exports = InsufficientBalanceError;
