const WalletConfig = require("./WalletConfig");

class WalletHealthContract {
  static build(service) {
    const wallets = service.list().length;
    const frozen = service.list().filter((w) => w.state === "FROZEN").length;
    return Object.freeze({
      healthy: true,
      wallets,
      frozen,
      version: service.config?.version || WalletConfig.version,
      sourceOfTruth: "LEDGER",
      checkedAt: new Date().toISOString(),
    });
  }
}

module.exports = WalletHealthContract;
