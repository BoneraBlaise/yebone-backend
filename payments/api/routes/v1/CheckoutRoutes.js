const { v1 } = require("../../versioning");

class CheckoutRoutes {
  constructor({ controller }) {
    this.controller = controller;
    this.prefix = `${v1.basePath}${v1.namespaces.checkout}`;
  }

  getDefinitions() {
    return [
      { method: "POST", path: "/", handler: (req, res, next) => this.controller.checkout(req, res, next) },
    ];
  }
}

module.exports = CheckoutRoutes;
