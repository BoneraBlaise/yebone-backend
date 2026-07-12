const { v1 } = require("../../versioning");

class SettlementRoutes {
  constructor({ controller }) {
    this.controller = controller;
    this.prefix = `${v1.basePath}${v1.namespaces.settlements}`;
  }

  getDefinitions() {
    return [
      { method: "POST", path: "/settle", handler: (req, res, next) => this.controller.settle(req, res, next) },
      { method: "POST", path: "/preview", handler: (req, res, next) => this.controller.preview(req, res, next) },
    ];
  }
}

module.exports = SettlementRoutes;
