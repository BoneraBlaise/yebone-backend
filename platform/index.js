const PlatformModule = require("./PlatformModule");
const PlatformBootstrap = require("./runtime/PlatformBootstrap");
const { registerPlatformRoutes, getPlatformContext } = require("./runtime/registerPlatformRoutes");

function bootstrapPlatform(options = {}) {
  return PlatformModule.bootstrap(options);
}

module.exports = {
  bootstrapPlatform,
  PlatformModule,
  PlatformBootstrap,
  registerPlatformRoutes,
  getPlatformContext,
  environment: require("./environment"),
  configuration: require("./configuration"),
  secrets: require("./secrets"),
  database: require("./database"),
  storage: require("./storage"),
  email: require("./email"),
  deployment: require("./deployment"),
  health: require("./health"),
  runtime: require("./runtime"),
  di: require("./di"),
};
