const { v1 } = require("../../versioning");

class PaymentRoutes {
  constructor({ controller }) {
    this.controller = controller;
    this.prefix = `${v1.basePath}${v1.namespaces.orders}`;
  }

  getDefinitions() {
    return [
      { method: "POST", path: "/", handler: (req, res, next) => this.controller.create(req, res, next) },
      { method: "POST", path: "/capture", handler: (req, res, next) => this.controller.capture(req, res, next) },
    ];
  }
}

module.exports = PaymentRoutes;
