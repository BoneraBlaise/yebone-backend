const Wallet = require("./Wallet");
const WalletConfig = require("./WalletConfig");
const WalletHealthContract = require("./WalletHealthContract");
const WalletNotFoundError = require("./errors/WalletNotFoundError");
const WalletFrozenError = require("./errors/WalletFrozenError");
const InsufficientBalanceError = require("./errors/InsufficientBalanceError");

class WalletService {
  constructor({ bridge, config = WalletConfig }) {
    if (!bridge) throw new Error("WalletService requires bridge");
    this.bridge = bridge;
    this.config = config;
    this.wallets = new Map();
  }

  create(input = {}) {
    const wallet = Wallet.create(input);
    this.wallets.set(wallet.walletId, wallet);
    return wallet;
  }

  get(walletId) {
    const wallet = this.wallets.get(walletId);
    if (!wallet) throw new WalletNotFoundError(walletId);
    return wallet;
  }

  list() {
    return Array.from(this.wallets.values());
  }

  getBalance(walletId) {
    return this.bridge.getBalance(this.get(walletId));
  }

  project(walletId) {
    const wallet = this.get(walletId);
    return Object.freeze({
      wallet,
      balance: this.bridge.getBalance(wallet),
      transactions: this.bridge.projectTransactions(wallet),
      projectedAt: new Date().toISOString(),
    });
  }

  freeze(walletId) {
    const frozen = Wallet.withState(this.get(walletId), "FROZEN");
    this.wallets.set(walletId, frozen);
    return frozen;
  }

  unfreeze(walletId) {
    const active = Wallet.withState(this.get(walletId), "ACTIVE");
    this.wallets.set(walletId, active);
    return active;
  }

  assertAvailable(walletId, amount) {
    const wallet = this.get(walletId);
    if (wallet.state === "FROZEN") throw new WalletFrozenError(walletId);
    const balance = this.bridge.getBalance(wallet);
    if (balance.available < amount) {
      throw new InsufficientBalanceError(walletId, amount, balance.available);
    }
    return balance;
  }

  health() {
    return WalletHealthContract.build(this);
  }
}

module.exports = WalletService;
