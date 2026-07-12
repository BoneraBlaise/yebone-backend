const { v1 } = require("../../versioning");

class HealthRoutes {
  constructor({ controller }) {
    this.controller = controller;
    this.prefix = `${v1.basePath}${v1.namespaces.health}`;
  }

  getDefinitions() {
    return [
      { method: "GET", path: "/", handler: (req, res, next) => this.controller.status(req, res, next) },
    ];
  }
}

module.exports = HealthRoutes;
