const NotImplementedError = require("../errors/NotImplementedError");
const { WalletBalance } = require("../domain");
const { WalletCredited } = require("../events");

/**
 * Wallet balance workflow.
 */
class WalletWorkflow {
  constructor({ walletRepository, ledger }) {
    this.walletRepository = walletRepository;
    this.ledger = ledger;
  }

  async creditWallet({ ownerId, ownerType = "user", amount, currency, reason, metadata = {} }) {
    const draft = new WalletBalance({ ownerId, ownerType, currency });

    const events = [
      new WalletCredited(ownerId, { ownerType, amount, currency, reason }),
    ];

    throw new NotImplementedError("WalletWorkflow", "creditWallet");
  }

  async debitWallet({ ownerId, ownerType = "user", amount, currency, reason, metadata = {} }) {
    throw new NotImplementedError("WalletWorkflow", "debitWallet");
  }

  async reserveWalletBalance({ ownerId, ownerType = "user", amount, currency, referenceId, metadata = {} }) {
    throw new NotImplementedError("WalletWorkflow", "reserveWalletBalance");
  }

  async releaseReservedBalance({ ownerId, ownerType = "user", amount, currency, referenceId, metadata = {} }) {
    throw new NotImplementedError("WalletWorkflow", "releaseReservedBalance");
  }
}

module.exports = WalletWorkflow;
