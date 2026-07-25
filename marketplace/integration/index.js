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
const {
  getConfigurationHistoryService,
} = require("./ConfigurationHistoryService");
const {
  ConfigurationWorkflowService,
} = require("./ConfigurationWorkflowService");

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

  try {
    getConfigurationHistoryService().setModel(require("../../model/configurationHistory"));
  } catch {
    /* optional in tests */
  }

  const workflow = new ConfigurationWorkflowService({ bridge });

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
      const result = await bridge.saveDraftSection(req.params.section, req.body?.values || req.body, {
        admin: auth.userId,
        reason: req.body?.reason || null,
      });
      res.status(200).json({ success: true, data: result, message: "Draft saved" });
    })
  );

  router.post(
    "/platform-configuration/publish",
    isAuthenticated,
    catchAsyncErrors(async (req, res) => {
      const auth = assertSuperAdmin(req, res);
      if (!auth) return;
      const result = await bridge.publishDraft({
        admin: auth.userId,
        reason: req.body?.reason || null,
        sections: req.body?.sections || null,
      });
      res.status(200).json({ success: true, data: result, message: "Configuration published" });
    })
  );

  router.get(
    "/platform-configuration/workflow",
    isAuthenticated,
    catchAsyncErrors(async (req, res) => {
      const auth = assertSuperAdmin(req, res);
      if (!auth) return;
      const data = await workflow.getWorkflowState();
      res.status(200).json({ success: true, data });
    })
  );

  router.put(
    "/configuration/draft/:module",
    isAuthenticated,
    catchAsyncErrors(async (req, res) => {
      const auth = assertSuperAdmin(req, res);
      if (!auth) return;
      const module = req.params.module;
      if (module === "delivery") {
        const result = await bridge.saveModuleDraft("delivery", req.body?.settings || req.body, {
          admin: auth.userId,
          reason: req.body?.reason || null,
        });
        return res.status(200).json({ success: true, data: result, message: "Delivery draft saved" });
      }
      res.status(400).json({ success: false, reason: "UNSUPPORTED_MODULE" });
    })
  );

  router.post(
    "/configuration/publish/:module",
    isAuthenticated,
    catchAsyncErrors(async (req, res) => {
      const auth = assertSuperAdmin(req, res);
      if (!auth) return;
      const result = await bridge.publishDraft({
        admin: auth.userId,
        reason: req.body?.reason || null,
      });
      res.status(200).json({ success: true, data: result, message: "Configuration published" });
    })
  );

  router.get(
    "/configuration-history",
    isAuthenticated,
    catchAsyncErrors(async (req, res) => {
      const auth = assertSuperAdmin(req, res);
      if (!auth) return;
      const data = await getConfigurationHistoryService().list({
        module: req.query.module || null,
        changedBy: req.query.changedBy || req.query.user || null,
        from: req.query.from || null,
        to: req.query.to || null,
        search: req.query.search || "",
        limit: Number(req.query.limit || 100),
        page: Number(req.query.page || 1),
      });
      res.status(200).json({ success: true, data });
    })
  );

  router.post(
    "/configuration-history/:historyId/rollback",
    isAuthenticated,
    catchAsyncErrors(async (req, res) => {
      const auth = assertSuperAdmin(req, res);
      if (!auth) return;
      const result = await bridge.rollbackFromHistory(req.params.historyId, {
        admin: auth.userId,
        reason: req.body?.reason || req.body?.note || null,
      });
      res.status(200).json({ success: true, data: result, message: "Configuration restored" });
    })
  );

  router.post(
    "/configuration/simulate",
    isAuthenticated,
    catchAsyncErrors(async (req, res) => {
      const auth = assertSuperAdmin(req, res);
      if (!auth) return;
      await bridge.initialize();
      const sim = workflow.getSimulators();
      const { type, input = {} } = req.body || {};
      const draft = bridge.store.getDraftBusinessValues();
      let result = null;
      if (type === "commission") {
        result = sim.simulateCommission({
          ...input,
          categoryCommissions: input.categoryCommissions || draft.categoryCommissions,
        });
      } else if (type === "referral") {
        result = sim.simulateReferralPayouts({
          ...input,
          referralSettings: input.referralSettings || draft.referral,
        });
      } else if (type === "ai") {
        result = sim.simulateAiRevenue({
          ...input,
          aiProducts: input.aiProducts || draft.aiProducts,
        });
      } else if (type === "delivery") {
        result = sim.simulateDelivery({
          ...input,
          deliverySettings: input.deliverySettings || bridge.store.getModuleDraft("delivery") || { pricing: draft.deliveryPricing },
        });
      } else {
        return res.status(400).json({ success: false, reason: "INVALID_SIMULATOR" });
      }
      res.status(200).json({ success: true, data: result });
    })
  );

  router.get(
    "/runtime-feature-flags",
    isAuthenticated,
    catchAsyncErrors(async (req, res) => {
      const auth = assertSuperAdmin(req, res);
      if (!auth) return;
      await bridge.initialize();
      res.status(200).json({
        success: true,
        data: bridge.store.getDraftBusinessValues().runtimeFeatures || {},
      });
    })
  );

  router.put(
    "/runtime-feature-flags",
    isAuthenticated,
    catchAsyncErrors(async (req, res) => {
      const auth = assertSuperAdmin(req, res);
      if (!auth) return;
      const result = await bridge.saveDraftSection("runtimeFeatures", req.body?.runtimeFeatures || req.body, {
        admin: auth.userId,
        reason: req.body?.reason || null,
        module: "feature-flags",
      });
      if (req.body?.publish) {
        await bridge.publishDraft({ admin: auth.userId, reason: req.body?.reason });
      }
      res.status(200).json({ success: true, data: result });
    })
  );

  router.get(
    "/runtime-feature-flags/public",
    catchAsyncErrors(async (_req, res) => {
      await bridge.initialize();
      res.status(200).json({
        success: true,
        data: bridge.store.getBusinessValues().runtimeFeatures || {},
      });
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
