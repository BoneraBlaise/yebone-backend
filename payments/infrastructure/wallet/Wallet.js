const { randomUUID } = require("crypto");
const WalletConfig = require("./WalletConfig");
const InvalidPostingError = require("../ledger/errors/InvalidPostingError");

class Wallet {
  static create(input = {}) {
    const wallet = {
      walletId: input.walletId || randomUUID(),
      ownerId: input.ownerId,
      type: input.type,
      state: input.state || "ACTIVE",
      currency: input.currency || WalletConfig.defaultCurrency,
      metadata: input.metadata && typeof input.metadata === "object" ? { ...input.metadata } : {},
      createdAt: input.createdAt || new Date().toISOString(),
      updatedAt: input.updatedAt || new Date().toISOString(),
    };

    Wallet.validate(wallet);
    return Object.freeze(wallet);
  }

  static validate(wallet) {
    if (!wallet || typeof wallet !== "object") {
      throw new InvalidPostingError("Wallet must be an object");
    }
    if (!wallet.ownerId) {
      throw new InvalidPostingError("Wallet ownerId is required");
    }
    if (!WalletConfig.walletTypes.includes(wallet.type)) {
      throw new InvalidPostingError(`Invalid wallet type: ${wallet.type}`);
    }
    if (!WalletConfig.walletStates.includes(wallet.state)) {
      throw new InvalidPostingError(`Invalid wallet state: ${wallet.state}`);
    }
    return true;
  }

  static withState(wallet, state) {
    return Wallet.create({ ...wallet, state, updatedAt: new Date().toISOString() });
  }
}

module.exports = Wallet;
