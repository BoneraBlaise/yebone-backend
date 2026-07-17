const express = require("express");
const catchAsyncErrors = require("../../middleware/catchAsyncErrors");
const VendorPlatform = require("./VendorPlatform");

let vendorPlatformInstance = null;

function createVendorPlatform(marketplaceCore, options = {}) {
  vendorPlatformInstance = new VendorPlatform({
    marketplaceCore,
    config: options.config,
  });
  return vendorPlatformInstance;
}

function getVendorPlatform() {
  if (!vendorPlatformInstance) {
    throw new Error("Vendor platform not initialized — call registerVendorPlatform first");
  }
  return vendorPlatformInstance;
}

function registerVendorPlatform(app, marketplaceCore, options = {}) {
  const platform = createVendorPlatform(marketplaceCore, options);
  app.locals.vendorPlatform = platform;

  const router = express.Router();
  router.get(
    "/health",
    catchAsyncErrors(async (_req, res) => {
      res.status(200).json({ success: true, data: platform.health.check() });
    })
  );

  app.use("/api/v2/marketplace/vendor", router);
  return platform;
}

module.exports = {
  VendorPlatform,
  VendorConfiguration: require("./VendorConfiguration"),
  VendorRegistry: require("./VendorRegistry"),
  VendorPermissions: require("./VendorPermissions"),
  VendorLifecycle: require("./VendorLifecycle"),
  VendorProfile: require("./VendorProfile"),
  VendorVerification: require("./VendorVerification"),
  VendorAnalytics: require("./VendorAnalytics"),
  VendorSettings: require("./VendorSettings"),
  VendorHealth: require("./VendorHealth"),
  VendorHooks: require("./VendorHooks"),
  createVendorPlatform,
  getVendorPlatform,
  registerVendorPlatform,
};
