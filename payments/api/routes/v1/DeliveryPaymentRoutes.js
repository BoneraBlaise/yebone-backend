const { v1 } = require("../../versioning");

class DeliveryPaymentRoutes {
  constructor({ controller }) {
    this.controller = controller;
    this.prefix = `${v1.basePath}${v1.namespaces.delivery}`;
  }

  getDefinitions() {
    return [
      { method: "POST", path: "/prepare", handler: (req, res, next) => this.controller.prepare(req, res, next) },
      { method: "POST", path: "/settle", handler: (req, res, next) => this.controller.settle(req, res, next) },
    ];
  }
}

module.exports = DeliveryPaymentRoutes;
