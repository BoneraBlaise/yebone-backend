const express = require("express");
const catchAsyncErrors = require("../../middleware/catchAsyncErrors");
const { isAuthenticated } = require("../../middleware/auth");
const PlatformAuthService = require("../integration/auth/PlatformAuthService");
const AIPlatform = require("./AIPlatform");

let aiPlatformInstance = null;

function createAIPlatform(marketplaceCore, options = {}) {
  aiPlatformInstance = new AIPlatform({
    marketplaceCore,
    config: options.config,
  });
  return aiPlatformInstance;
}

function getAIPlatform() {
  if (!aiPlatformInstance) {
    throw new Error("AI platform not initialized — call registerAIPlatform first");
  }
  return aiPlatformInstance;
}

function registerAIPlatform(app, marketplaceCore, options = {}) {
  const platform = createAIPlatform(marketplaceCore, options);
  platform.initialize();
  app.locals.aiPlatform = platform;

  const router = express.Router();
  router.get(
    "/health",
    catchAsyncErrors(async (_req, res) => {
      res.status(200).json({ success: true, data: platform.health.check({ admin: false }) });
    })
  );

  router.get(
    "/admin/products",
    isAuthenticated,
    catchAsyncErrors(async (req, res) => {
      const access = PlatformAuthService.assertSuperAdmin(req);
      if (!access.valid) {
        return res.status(access.statusCode).json({ success: false, reason: access.reason });
      }
      const { getPlatformConfigurationBridge } = require("../integration/PlatformConfigurationBridge");
      const bridge = getPlatformConfigurationBridge();
      await bridge.initialize();
      res.status(200).json({
        success: true,
        data: {
          products: bridge.getAdminAiProducts(),
          workflow: bridge.getWorkflowSnapshot(),
          health: platform.health.check({ admin: true }),
          metrics: platform.metrics?.getSummary?.() || null,
        },
      });
    })
  );

  router.put(
    "/admin/products",
    isAuthenticated,
    catchAsyncErrors(async (req, res) => {
      const access = PlatformAuthService.assertSuperAdmin(req);
      if (!access.valid) {
        return res.status(access.statusCode).json({ success: false, reason: access.reason });
      }
      const { getPlatformConfigurationBridge } = require("../integration/PlatformConfigurationBridge");
      const bridge = getPlatformConfigurationBridge();
      const result = await bridge.updateSection("aiProducts", req.body?.aiProducts || req.body, {
        admin: access.userId || req.user?._id?.toString?.(),
        reason: req.body?.reason || null,
        module: "ai",
      });
      res.status(200).json({
        success: true,
        data: result.snapshot.draftBusinessValues?.aiProducts || result.snapshot.businessValues?.aiProducts,
        workflow: result.workflow,
      });
    })
  );

  router.get(
    "/admin/analytics",
    isAuthenticated,
    catchAsyncErrors(async (req, res) => {
      const access = PlatformAuthService.assertSuperAdmin(req);
      if (!access.valid) {
        return res.status(access.statusCode).json({ success: false, reason: access.reason });
      }
      const period = req.query.period === "monthly" ? "monthly" : "daily";
      const summary = await platform.analyticsPersistence.getSummary({ period });
      res.status(200).json({
        success: true,
        data: {
          runtime: platform.metrics.getSummary(),
          persisted: summary,
        },
      });
    })
  );

  router.post(
    "/admin/credits/adjust",
    isAuthenticated,
    catchAsyncErrors(async (req, res) => {
      const access = PlatformAuthService.assertSuperAdmin(req);
      if (!access.valid) {
        return res.status(access.statusCode).json({ success: false, reason: access.reason });
      }
      const { vendorId, amount, reason } = req.body || {};
      if (!vendorId) {
        return res.status(400).json({ success: false, message: "vendorId is required" });
      }
      const wallet = await platform.entitlements.credits.adminAdjust(vendorId, Number(amount), {
        reason: reason || "admin_adjustment",
        adminId: access.userId,
      });
      res.status(200).json({ success: true, data: wallet });
    })
  );

  app.use("/api/v2/marketplace/ai", router);

  return platform;
}

module.exports = {
  AIPlatform,
  AIConfiguration: require("./AIConfiguration"),
  AIGateway: require("./AIGateway"),
  AIPlanner: require("./AIPlanner"),
  AIToolRegistry: require("./AIToolRegistry"),
  AICapabilityRegistry: require("./AICapabilityRegistry"),
  SearchParameterExtractor: require("./search/SearchParameterExtractor"),
  AIConversationContext: require("./conversation/AIConversationContext"),
  ConversationFlowAnalyzer: require("./conversation/ConversationFlowAnalyzer"),
  ConversationMemoryEngine: require("./conversation/ConversationMemoryEngine"),
  RecommendationEngine: require("./recommendations/RecommendationEngine"),
  CheckoutIntelligenceEngine: require("./checkout/CheckoutIntelligenceEngine"),
  AIPromptRegistry: require("./AIPromptRegistry"),
  AIProviderManager: require("./AIProviderManager"),
  AIHealth: require("./AIHealth"),
  AIHooks: require("./AIHooks"),
  AIMetrics: require("./AIMetrics"),
  createAIPlatform,
  getAIPlatform,
  registerAIPlatform,
};
