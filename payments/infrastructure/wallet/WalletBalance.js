const WalletConfig = require("./WalletConfig");

class WalletBalance {
  static create(input = {}) {
    return Object.freeze({
      walletId: input.walletId,
      ownerId: input.ownerId,
      type: input.type,
      currency: input.currency || WalletConfig.defaultCurrency,
      available: WalletBalance._round(input.available),
      pending: WalletBalance._round(input.pending || 0),
      total: WalletBalance._round(input.total),
      entryCount: input.entryCount || 0,
      derivedAt: input.derivedAt || new Date().toISOString(),
      source: "LEDGER",
    });
  }

  static _round(value) {
    return Number(Number(value || 0).toFixed(WalletConfig.decimalPlaces));
  }
}

module.exports = WalletBalance;
