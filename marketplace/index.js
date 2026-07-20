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

  const { registerGrowthPlatform } = require("./growth");
  registerGrowthPlatform(app, options.growth || {});

  const { registerAIPlatform } = require("./ai");
  registerAIPlatform(app, core, options.ai || {});

  const { registerDeliveryConfigurationPlatform } = require("./delivery/configuration");
  registerDeliveryConfigurationPlatform(app, options.deliveryConfiguration || {});

  const PersistentDeliveryRepository = require("./integration/delivery/PersistentDeliveryRepository");
  const { registerDeliveryPlatform } = require("./delivery");
  registerDeliveryPlatform(app, core, {
    ...(options.delivery || {}),
    repository: options.delivery?.repository || new PersistentDeliveryRepository({
      persist: !options.delivery?.useMemoryOnly,
    }),
  });

  const { registerCourierPlatform } = require("./delivery/courier");
  registerCourierPlatform(app, core, options.courier || {});

  const { registerGrowthCommercePlatform } = require("./growth-commerce");
  const growthCommercePlatform = registerGrowthCommercePlatform(app, options.growthCommerce || {});

  const { registerSellerOperationsPlatform } = require("./seller-operations");
  const sellerOperationsPlatform = registerSellerOperationsPlatform(app, options.sellerOperations || {});

  const { registerPlatformIntegration } = require("./integration");
  const integration = registerPlatformIntegration(app, {
    useMemoryOnly: Boolean(options.integration?.useMemoryOnly),
    ...(options.integration || {}),
  });
  integration.bindOrderService(core.services.order);
  growthCommercePlatform.bindFeatureFlags(integration.featureFlags);
  growthCommercePlatform.bindObservability(integration.observability);
  sellerOperationsPlatform.bindFeatureFlags(integration.featureFlags);
  sellerOperationsPlatform.bindObservability(integration.observability);
  integration.initialize().catch((error) => {
    console.error("Platform integration init failed:", error.message);
  });

  if (!options.integration?.skipSearchIndexes) {
    try {
      const searchPlatform = require("./search").getSearchPlatform();
      searchPlatform?.searchService?.ensureRecommendedIndexes?.().catch(() => {});
    } catch (_error) {
      // Search indexes optional during isolated tests.
    }
  }

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
  getGrowthPlatform: () => require("./growth").getGrowthPlatform(),
  getGrowthCommercePlatform: () => require("./growth-commerce").getGrowthCommercePlatform(),
  getSellerOperationsPlatform: () => require("./seller-operations").getSellerOperationsPlatform(),
  getPlatformIntegration: () => require("./integration/PlatformIntegration").getPlatformIntegration(),
};
