const express = require("express");
const catchAsyncErrors = require("../../middleware/catchAsyncErrors");
const { isAuthenticated } = require("../../middleware/auth");
const PlatformAuthService = require("./auth/PlatformAuthService");
const {
  createPlatformIntegration,
  getPlatformIntegration,
} = require("./PlatformIntegration");
const {
  createPlatformConfigurationBridge,
  getPlatformConfigurationBridge,
} = require("./PlatformConfigurationBridge");

function registerPlatformIntegration(app, options = {}) {
  const integration = createPlatformIntegration(options);
  app.locals.platformIntegration = integration;

  const bridge = createPlatformConfigurationBridge({
    storeOptions: {
      useMemoryOnly: Boolean(options.useMemoryOnly),
      dataDir: options.platformConfigurationDataDir,
    },
  });

  try {
    const PlatformConfigurationModel = require("../../model/platformConfiguration");
    bridge.store.setModel(PlatformConfigurationModel);
    const mongoose = require("mongoose");
    if (mongoose.connection?.readyState === 1) {
      bridge.initialize().catch(() => {});
    } else {
      mongoose.connection?.once("connected", () => {
        bridge.store.scheduleMongoReload();
        bridge.initialize().catch(() => {});
      });
    }
  } catch {
    bridge.initialize().catch(() => {});
  }

  app.locals.platformConfigurationBridge = bridge;

  const router = express.Router();

  const assertSuperAdmin = (req, res) => {
    const access = PlatformAuthService.assertSuperAdmin(req);
    if (!access.valid) {
      res.status(access.statusCode).json({ success: false, reason: access.reason });
      return null;
    }
    return { userId: access.userId || req.user?._id?.toString?.() || "admin" };
  };

  router.get(
    "/health",
    catchAsyncErrors(async (_req, res) => {
      await integration.initialize();
      res.status(200).json({ success: true, data: integration.getHealth() });
    })
  );

  router.get(
    "/feature-flags",
    catchAsyncErrors(async (_req, res) => {
      await integration.initialize();
      res.status(200).json({ success: true, data: await integration.featureFlags.getFlags() });
    })
  );

  router.get(
    "/platform-configuration",
    isAuthenticated,
    catchAsyncErrors(async (req, res) => {
      const auth = assertSuperAdmin(req, res);
      if (!auth) return;
      const data = await bridge.aggregateConfiguration();
      res.status(200).json({ success: true, data });
    })
  );

  router.get(
    "/platform-configuration/public/banners",
    catchAsyncErrors(async (req, res) => {
      await bridge.initialize();
      const type = req.query.type || null;
      res.status(200).json({ success: true, data: bridge.getPublicBanners(type) });
    })
  );

  router.get(
    "/platform-configuration/public/ai-products",
    catchAsyncErrors(async (_req, res) => {
      await bridge.initialize();
      res.status(200).json({ success: true, data: bridge.getPublicAiProducts() });
    })
  );

  router.put(
    "/platform-configuration/section/:section",
    isAuthenticated,
    catchAsyncErrors(async (req, res) => {
      const auth = assertSuperAdmin(req, res);
      if (!auth) return;
      const result = await bridge.updateSection(req.params.section, req.body?.values || req.body, {
        admin: auth.userId,
        reason: req.body?.reason || null,
      });

      if (req.params.section === "categoryCommissions") {
        await bridge.syncCategoryCommissionRules(result.snapshot.businessValues.categoryCommissions, {
          admin: auth.userId,
          reason: req.body?.reason,
        });
      }
      if (req.params.section === "referral" && req.body?.values?.categoryRates) {
        await bridge.syncReferralCategoryRules(req.body.values.categoryRates, {
          admin: auth.userId,
          reason: req.body?.reason,
        });
      }

      res.status(200).json({ success: true, data: result });
    })
  );

  router.post(
    "/platform-configuration/banners",
    isAuthenticated,
    catchAsyncErrors(async (req, res) => {
      const auth = assertSuperAdmin(req, res);
      if (!auth) return;
      const banner = await bridge.upsertBanner(req.body, {
        admin: auth.userId,
        reason: req.body?.reason || null,
      });
      res.status(201).json({ success: true, data: banner });
    })
  );

  router.delete(
    "/platform-configuration/banners/:id",
    isAuthenticated,
    catchAsyncErrors(async (req, res) => {
      const auth = assertSuperAdmin(req, res);
      if (!auth) return;
      const result = await bridge.deleteBanner(req.params.id, {
        admin: auth.userId,
        reason: req.body?.reason || null,
      });
      res.status(200).json({ success: true, data: result });
    })
  );

  router.post(
    "/platform-configuration/upload/banner",
    isAuthenticated,
    catchAsyncErrors(async (req, res) => {
      const auth = assertSuperAdmin(req, res);
      if (!auth) return;
      const UploadService = require("../services/UploadService");
      const service = new UploadService();
      const result = await service.uploadSingle(req.body?.image, "banners");
      res.status(201).json({ success: true, data: result });
    })
  );

  router.get(
    "/platform-configuration/audit",
    isAuthenticated,
    catchAsyncErrors(async (req, res) => {
      const auth = assertSuperAdmin(req, res);
      if (!auth) return;
      await bridge.initialize();
      res.status(200).json({
        success: true,
        data: bridge.getAuditHistory(Number(req.query.limit || 50)),
      });
    })
  );

  router.get(
    "/audit",
    catchAsyncErrors(async (req, res) => {
      const access = PlatformAuthService.assertSuperAdmin(req);
      if (!access.valid) {
        return res.status(access.statusCode).json({ success: false, reason: access.reason });
      }
      const entries = await integration.audit.list({
        platform: req.query.platform,
        orderId: req.query.orderId,
        limit: Number(req.query.limit || 100),
      });
      res.status(200).json({ success: true, data: entries });
    })
  );

  router.get(
    "/metrics",
    catchAsyncErrors(async (req, res) => {
      const access = PlatformAuthService.assertSuperAdmin(req);
      if (!access.valid) {
        return res.status(access.statusCode).json({ success: false, reason: access.reason });
      }
      res.status(200).json({ success: true, data: integration.observability.getMetrics() });
    })
  );

  app.use("/api/v2/marketplace/integration", router);
  return integration;
}

module.exports = {
  registerPlatformIntegration,
  getPlatformIntegration,
  getPlatformConfigurationBridge,
  PlatformAuthService,
};
