const express = require("express");
const catchAsyncErrors = require("../middleware/catchAsyncErrors");
const MarketplaceInitializer = require("./core/MarketplaceInitializer");

let marketplaceCoreInstance = null;

function createMarketplaceCore(options = {}) {
  const MarketplaceCore = require("./core/MarketplaceCore");
  marketplaceCoreInstance = new MarketplaceCore(options);
  return marketplaceCoreInstance;
}

function getMarketplaceCore() {
  if (!marketplaceCoreInstance) {
    return createMarketplaceCore();
  }
  return marketplaceCoreInstance;
}

function registerMarketplaceCore(app, options = {}) {
  const core = createMarketplaceCore(options);
  MarketplaceInitializer.initialize(app, core);

  const router = express.Router();
  router.get(
    "/health",
    catchAsyncErrors(async (_req, res) => {
      res.status(200).json({ success: true, data: core.health.check() });
    })
  );

  app.use("/api/v2/marketplace", router);

  const { registerVendorPlatform } = require("./vendor");
  registerVendorPlatform(app, core, options.vendor || {});

  return core;
}

module.exports = {
  createMarketplaceCore,
  getMarketplaceCore,
  registerMarketplaceCore,
  MarketplaceCore: require("./core/MarketplaceCore"),
  getVendorPlatform: () => require("./vendor").getVendorPlatform(),
};
