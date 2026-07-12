const PlatformBootstrap = require("./PlatformBootstrap");

let _platformContext = null;

function getPlatformContext(options) {
  if (!_platformContext || options?.force) {
    _platformContext = PlatformBootstrap.create(options);
  }
  return _platformContext;
}

function registerPlatformRoutes(app, options = {}) {
  const platform = options.platform || getPlatformContext(options);
  const healthController = platform.container.resolve("healthController");

  app.get("/health", (req, res) => healthController.health(req, res));
  app.get("/health/liveness", (req, res) => healthController.liveness(req, res));
  app.get("/health/readiness", (req, res) => healthController.readiness(req, res));

  return platform;
}

module.exports = { registerPlatformRoutes, getPlatformContext, PlatformBootstrap };
