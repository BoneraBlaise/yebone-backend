const { v1 } = require("../../api/versioning");

/**
 * Registers API version metadata on the Express app.
 */
class ApiVersionRegistration {
  static register(app, { logger } = {}) {
    app.locals.paymentApiVersions = {
      active: [v1.version],
      default: v1.version,
      basePath: v1.basePath,
    };

    logger?.info("Payment API version registered", app.locals.paymentApiVersions);
    return app.locals.paymentApiVersions;
  }
}

module.exports = ApiVersionRegistration;
