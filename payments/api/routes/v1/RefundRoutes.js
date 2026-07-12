const { v1 } = require("../../versioning");

class RefundRoutes {
  constructor({ controller }) {
    this.controller = controller;
    this.prefix = `${v1.basePath}${v1.namespaces.refunds}`;
  }

  getDefinitions() {
    return [
      { method: "POST", path: "/request", handler: (req, res, next) => this.controller.request(req, res, next) },
      { method: "POST", path: "/approve", handler: (req, res, next) => this.controller.approve(req, res, next) },
    ];
  }
}

module.exports = RefundRoutes;
