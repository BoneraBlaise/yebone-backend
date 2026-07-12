const { v1 } = require("../../versioning");

class EscrowRoutes {
  constructor({ controller }) {
    this.controller = controller;
    this.prefix = `${v1.basePath}${v1.namespaces.escrow}`;
  }

  getDefinitions() {
    return [
      { method: "POST", path: "/hold", handler: (req, res, next) => this.controller.hold(req, res, next) },
      { method: "POST", path: "/release", handler: (req, res, next) => this.controller.release(req, res, next) },
    ];
  }
}

module.exports = EscrowRoutes;
