/**
 * Initializes Marketplace Core after Express app wiring.
 */
class MarketplaceInitializer {
  static initialize(app, core) {
    core.lifecycle.markStarting();
    app.locals.marketplaceCore = core;
    core.lifecycle.markReady();
    return core;
  }
}

module.exports = MarketplaceInitializer;
