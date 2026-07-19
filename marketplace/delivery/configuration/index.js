const express = require("express");
const catchAsyncErrors = require("../../../middleware/catchAsyncErrors");
const { isAuthenticated } = require("../../../middleware/auth");
const DeliveryConfigurationPlatform = require("./DeliveryConfigurationPlatform");
const DeliveryAdminAccess = require("./DeliveryAdminAccess");
const DeliveryConfigStore = require("./DeliveryConfigStore");
const FeatureFlagService = require("./FeatureFlagService");
const DeliveryOperationGuard = require("./DeliveryOperationGuard");

let deliveryConfigurationPlatformInstance = null;

function createDeliveryConfigurationPlatform(options = {}) {
  deliveryConfigurationPlatformInstance = new DeliveryConfigurationPlatform(options);
  return deliveryConfigurationPlatformInstance;
}

function getDeliveryConfigurationPlatform() {
  if (!deliveryConfigurationPlatformInstance) {
    throw new Error(
      "Delivery configuration platform not initialized — call registerDeliveryConfigurationPlatform first"
    );
  }
  return deliveryConfigurationPlatformInstance;
}

function respondGuardFailure(res, error) {
  return res.status(error.statusCode || 403).json({
    success: false,
    reason: error.reason || "FEATURE_DISABLED",
    feature: error.feature,
    message: error.message,
  });
}

function runGuard(guardFn, res) {
  try {
    guardFn();
    return true;
  } catch (error) {
    if (error.reason === "FEATURE_DISABLED") {
      respondGuardFailure(res, error);
      return false;
    }
    throw error;
  }
}

function registerDeliveryConfigurationPlatform(app, options = {}) {
  const storeOptions = {
    useMemoryOnly: Boolean(options.useMemoryOnly),
    dataDir: options.dataDir,
  };

  const platform = createDeliveryConfigurationPlatform({
    ...options,
    storeOptions,
  });

  if (!options.useMemoryOnly) {
    try {
      const DeliveryConfigurationModel = require("../../../model/deliveryConfiguration");
      platform.store.setModel(DeliveryConfigurationModel);
    } catch (_error) {
      // Model unavailable in isolated tests — file store still works.
    }
  }

  platform.store.initializeSync();

  if (!options.useMemoryOnly) {
    const mongoose = require("mongoose");
    const reloadFromMongo = () => {
      if (mongoose.connection?.readyState === 1 && platform.store.DeliveryConfigurationModel) {
        platform.store.scheduleMongoReload();
        platform.initialize().catch((error) => {
          console.error("[DeliveryConfig] Mongo reload failed:", error.message);
        });
      }
    };
    if (mongoose.connection?.readyState === 1) reloadFromMongo();
    else mongoose.connection?.once("connected", reloadFromMongo);
  }

  app.locals.deliveryConfigurationPlatform = platform;
  return platform;
}

function attachDeliveryConfigurationRoutes(router, platform, { authMiddleware = isAuthenticated } = {}) {
  router.get(
    "/features",
    catchAsyncErrors(async (_req, res) => {
      res.status(200).json({ success: true, data: platform.getFeatures() });
    })
  );

  router.get(
    "/checkout-options",
    catchAsyncErrors(async (_req, res) => {
      res.status(200).json({ success: true, data: platform.getCheckoutOptions() });
    })
  );

  router.get(
    "/configuration",
    authMiddleware,
    catchAsyncErrors(async (req, res) => {
      const auth = DeliveryAdminAccess.assertSuperAdmin(req);
      if (!auth.valid) {
        return res.status(auth.statusCode).json({ success: false, reason: auth.reason });
      }
      res.status(200).json({ success: true, data: platform.getConfiguration() });
    })
  );

  router.put(
    "/configuration",
    authMiddleware,
    catchAsyncErrors(async (req, res) => {
      const auth = DeliveryAdminAccess.assertSuperAdmin(req);
      if (!auth.valid) {
        return res.status(auth.statusCode).json({ success: false, reason: auth.reason });
      }

      const result = await platform.updateConfiguration(req.body?.settings || req.body, {
        admin: auth.userId,
        reason: req.body?.reason || null,
      });
      res.status(200).json({ success: true, data: result });
    })
  );

  router.get(
    "/configuration/audit",
    authMiddleware,
    catchAsyncErrors(async (req, res) => {
      const auth = DeliveryAdminAccess.assertSuperAdmin(req);
      if (!auth.valid) {
        return res.status(auth.statusCode).json({ success: false, reason: auth.reason });
      }
      const limit = Number(req.query.limit) || 100;
      res.status(200).json({
        success: true,
        data: platform.getAuditHistory(limit),
        meta: { count: platform.getAuditHistory(limit).length },
      });
    })
  );

  router.get(
    "/configuration/metrics",
    authMiddleware,
    catchAsyncErrors(async (req, res) => {
      const auth = DeliveryAdminAccess.assertSuperAdmin(req);
      if (!auth.valid) {
        return res.status(auth.statusCode).json({ success: false, reason: auth.reason });
      }
      res.status(200).json({ success: true, data: platform.getMetrics() });
    })
  );
}

module.exports = {
  DeliveryConfigurationPlatform,
  DeliveryConfigStore,
  FeatureFlagService,
  DeliveryOperationGuard,
  DeliveryAdminAccess,
  createDeliveryConfigurationPlatform,
  getDeliveryConfigurationPlatform,
  registerDeliveryConfigurationPlatform,
  attachDeliveryConfigurationRoutes,
  respondGuardFailure,
  runGuard,
};
