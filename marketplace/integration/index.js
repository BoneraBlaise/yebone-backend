const express = require("express");
const catchAsyncErrors = require("../../middleware/catchAsyncErrors");
const PlatformAuthService = require("./auth/PlatformAuthService");
const {
  createPlatformIntegration,
  getPlatformIntegration,
} = require("./PlatformIntegration");

function registerPlatformIntegration(app, options = {}) {
  const integration = createPlatformIntegration(options);
  app.locals.platformIntegration = integration;

  const router = express.Router();

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
  PlatformAuthService,
};
