const { v1 } = require("../../versioning");

class WalletRoutes {
  constructor({ controller }) {
    this.controller = controller;
    this.prefix = `${v1.basePath}${v1.namespaces.wallets}`;
  }

  getDefinitions() {
    return [
      { method: "POST", path: "/credit", handler: (req, res, next) => this.controller.credit(req, res, next) },
      { method: "POST", path: "/debit", handler: (req, res, next) => this.controller.debit(req, res, next) },
    ];
  }
}

module.exports = WalletRoutes;
