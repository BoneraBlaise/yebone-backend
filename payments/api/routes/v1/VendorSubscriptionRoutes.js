const { v1 } = require("../../versioning");

class VendorSubscriptionRoutes {
  constructor({ controller }) {
    this.controller = controller;
    this.prefix = `${v1.basePath}${v1.namespaces.subscriptions}`;
  }

  getDefinitions() {
    return [
      { method: "POST", path: "/create", handler: (req, res, next) => this.controller.create(req, res, next) },
      { method: "POST", path: "/activate", handler: (req, res, next) => this.controller.activate(req, res, next) },
    ];
  }
}

module.exports = VendorSubscriptionRoutes;
