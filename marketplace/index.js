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

  const { registerProductPlatform } = require("./catalog");
  registerProductPlatform(app, core, options.catalog || {});

  const { registerSearchPlatform } = require("./search");
  registerSearchPlatform(app, core, options.search || {});

  const { registerOrderPlatform } = require("./orders");
  registerOrderPlatform(app, core, options.orders || {});

  const { registerAIPlatform } = require("./ai");
  registerAIPlatform(app, core, options.ai || {});

  const { registerDeliveryConfigurationPlatform } = require("./delivery/configuration");
  registerDeliveryConfigurationPlatform(app, options.deliveryConfiguration || {});

  const { registerDeliveryPlatform } = require("./delivery");
  registerDeliveryPlatform(app, core, options.delivery || {});

  const { registerCourierPlatform } = require("./delivery/courier");
  registerCourierPlatform(app, core, options.courier || {});

  return core;
}

module.exports = {
  createMarketplaceCore,
  getMarketplaceCore,
  registerMarketplaceCore,
  MarketplaceCore: require("./core/MarketplaceCore"),
  getVendorPlatform: () => require("./vendor").getVendorPlatform(),
  getProductPlatform: () => require("./catalog").getProductPlatform(),
  getSearchPlatform: () => require("./search").getSearchPlatform(),
  getOrderPlatform: () => require("./orders").getOrderPlatform(),
  getAIPlatform: () => require("./ai").getAIPlatform(),
  getDeliveryPlatform: () => require("./delivery").getDeliveryPlatform(),
  getCourierPlatform: () => require("./delivery/courier").getCourierPlatform(),
  getDeliveryConfigurationPlatform: () =>
    require("./delivery/configuration").getDeliveryConfigurationPlatform(),
};
