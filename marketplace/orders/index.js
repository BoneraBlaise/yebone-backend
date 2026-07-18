const express = require("express");
const catchAsyncErrors = require("../../middleware/catchAsyncErrors");
const OrderPlatform = require("./OrderPlatform");

let orderPlatformInstance = null;

function createOrderPlatform(marketplaceCore, options = {}) {
  orderPlatformInstance = new OrderPlatform({
    marketplaceCore,
    config: options.config,
  });
  return orderPlatformInstance;
}

function getOrderPlatform() {
  if (!orderPlatformInstance) {
    throw new Error("Order platform not initialized — call registerOrderPlatform first");
  }
  return orderPlatformInstance;
}

function registerOrderPlatform(app, marketplaceCore, options = {}) {
  const platform = createOrderPlatform(marketplaceCore, options);
  app.locals.orderPlatform = platform;

  const router = express.Router();
  router.get(
    "/health",
    catchAsyncErrors(async (_req, res) => {
      res.status(200).json({ success: true, data: platform.health.check() });
    })
  );

  app.use("/api/v2/marketplace/orders", router);
  return platform;
}

module.exports = {
  OrderPlatform,
  OrderConfiguration: require("./OrderConfiguration"),
  OrderLifecycle: require("./OrderLifecycle"),
  OrderValidation: require("./OrderValidation"),
  OrderStatus: require("./OrderStatus"),
  OrderHistory: require("./OrderHistory"),
  OrderAnalytics: require("./OrderAnalytics"),
  OrderHealth: require("./OrderHealth"),
  OrderHooks: require("./OrderHooks"),
  createOrderPlatform,
  getOrderPlatform,
  registerOrderPlatform,
};
