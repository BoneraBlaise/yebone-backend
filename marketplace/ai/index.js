const express = require("express");
const catchAsyncErrors = require("../../middleware/catchAsyncErrors");
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
      res.status(200).json({ success: true, data: platform.health.check() });
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
  AIPromptRegistry: require("./AIPromptRegistry"),
  AIProviderManager: require("./AIProviderManager"),
  AIHealth: require("./AIHealth"),
  AIHooks: require("./AIHooks"),
  AIMetrics: require("./AIMetrics"),
  createAIPlatform,
  getAIPlatform,
  registerAIPlatform,
};
