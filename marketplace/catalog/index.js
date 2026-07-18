const express = require("express");
const catchAsyncErrors = require("../../middleware/catchAsyncErrors");
const ProductPlatform = require("./ProductPlatform");

let productPlatformInstance = null;

function createProductPlatform(marketplaceCore, options = {}) {
  productPlatformInstance = new ProductPlatform({
    marketplaceCore,
    config: options.config,
  });
  return productPlatformInstance;
}

function getProductPlatform() {
  if (!productPlatformInstance) {
    throw new Error("Product platform not initialized — call registerProductPlatform first");
  }
  return productPlatformInstance;
}

function registerProductPlatform(app, marketplaceCore, options = {}) {
  const platform = createProductPlatform(marketplaceCore, options);
  app.locals.productPlatform = platform;

  const router = express.Router();
  router.get(
    "/health",
    catchAsyncErrors(async (_req, res) => {
      res.status(200).json({ success: true, data: platform.health.check() });
    })
  );

  app.use("/api/v2/marketplace/catalog", router);
  return platform;
}

module.exports = {
  ProductPlatform,
  ProductCatalogConfig: require("./ProductCatalogConfig"),
  ProductCatalog: require("./ProductCatalog"),
  ProductLifecycle: require("./ProductLifecycle"),
  ProductInventory: require("./ProductInventory"),
  ProductPricing: require("./ProductPricing"),
  ProductMedia: require("./ProductMedia"),
  ProductCategories: require("./ProductCategories"),
  ProductSearch: require("./ProductSearch"),
  ProductValidation: require("./ProductValidation"),
  ProductAnalytics: require("./ProductAnalytics"),
  ProductHealth: require("./ProductHealth"),
  ProductHooks: require("./ProductHooks"),
  createProductPlatform,
  getProductPlatform,
  registerProductPlatform,
};
