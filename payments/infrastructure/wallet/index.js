const createWalletFoundation = require("./WalletFactory");

module.exports = {
  WalletConfig: require("./WalletConfig"),
  Wallet: require("./Wallet"),
  WalletTransaction: require("./WalletTransaction"),
  WalletBalance: require("./WalletBalance"),
  WalletProjection: require("./WalletProjection"),
  WalletLedgerBridge: require("./WalletLedgerBridge"),
  WalletService: require("./WalletService"),
  WalletHealthContract: require("./WalletHealthContract"),
  PayoutBatch: require("./PayoutBatch").PayoutBatch,
  PAYOUT_BATCH_STATUSES: require("./PayoutBatch").PAYOUT_BATCH_STATUSES,
  WalletNotFoundError: require("./errors/WalletNotFoundError"),
  InsufficientBalanceError: require("./errors/InsufficientBalanceError"),
  WalletFrozenError: require("./errors/WalletFrozenError"),
  createWalletFoundation,
  WalletFactory: createWalletFoundation,
};
