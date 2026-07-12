const NotImplementedError = require("../errors/NotImplementedError");

/**
 * Repository skeleton for wallet balances.
 */
class WalletRepository {
  async getBalance(_ownerId, _ownerType = "user") {
    throw new NotImplementedError("WalletRepository", "getBalance");
  }

  async updateBalance(_ownerId, _ownerType, _delta) {
    throw new NotImplementedError("WalletRepository", "updateBalance");
  }

  async save(_walletBalance) {
    throw new NotImplementedError("WalletRepository", "save");
  }
}

module.exports = WalletRepository;
