const PlatformBootstrap = require("./runtime/PlatformBootstrap");

class PlatformModule {
  static create(options = {}) {
    return PlatformBootstrap.create(options);
  }

  static bootstrap(options = {}) {
    return PlatformBootstrap.create(options);
  }
}

module.exports = PlatformModule;
