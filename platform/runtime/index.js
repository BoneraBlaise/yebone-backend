module.exports = {
  PlatformBootstrap: require("./PlatformBootstrap"),
  registerPlatformRoutes: require("./registerPlatformRoutes").registerPlatformRoutes,
  getPlatformContext: require("./registerPlatformRoutes").getPlatformContext,
};
