const express = require("express");
const catchAsyncErrors = require("../../middleware/catchAsyncErrors");
const { isAuthenticated, isSeller } = require("../../middleware/auth");
const GrowthCommercePlatform = require("./GrowthCommercePlatform");
const GrowthCommerceAccess = require("./GrowthCommerceAccess");

let growthCommercePlatformInstance = null;

function createGrowthCommercePlatform(options = {}) {
  growthCommercePlatformInstance = new GrowthCommercePlatform(options);
  return growthCommercePlatformInstance;
}

function getGrowthCommercePlatform() {
  if (!growthCommercePlatformInstance) {
    throw new Error("Growth Commerce platform not initialized — call registerGrowthCommercePlatform first");
  }
  return growthCommercePlatformInstance;
}

function respondGuardFailure(res, error) {
  return res.status(error.statusCode || 403).json({
    success: false,
    reason: error.reason || "FEATURE_DISABLED",
    feature: error.feature,
    message: error.message,
  });
}

function runFeatureGuard(featureFlags, key, res, fn) {
  try {
    if (featureFlags) GrowthCommerceAccess.assertFeatureEnabled(featureFlags, key);
    return fn();
  } catch (error) {
    if (error.reason === "FEATURE_DISABLED") {
      respondGuardFailure(res, error);
      return false;
    }
    throw error;
  }
}

function registerGrowthCommercePlatform(app, options = {}) {
  const platform = createGrowthCommercePlatform(options);

  if (!options.useMemoryOnly) {
    try {
      platform.setModels({
        CampaignModel: require("../../model/growthCommerceCampaign"),
        HomepageModel: require("../../model/growthCommerceHomepage"),
        AmbassadorModel: require("../../model/growthCommerceAmbassador"),
        ConfigModel: require("../../model/growthCommerceConfig"),
      });
    } catch (_error) {
      // isolated tests
    }
  }

  platform.initialize().catch((error) => {
    console.error("[GrowthCommerce] initialize failed:", error.message);
  });

  app.locals.growthCommercePlatform = platform;

  const router = express.Router();

  const resolveFeatureFlags = () => {
    try {
      const { getPlatformIntegration } = require("../integration/PlatformIntegration");
      return getPlatformIntegration().featureFlags;
    } catch (_error) {
      return null;
    }
  };

  router.get(
    "/health",
    catchAsyncErrors(async (_req, res) => {
      res.status(200).json({ success: true, data: platform.health() });
    })
  );

  router.get(
    "/features",
    catchAsyncErrors(async (_req, res) => {
      res.status(200).json({ success: true, data: platform.getSettings() });
    })
  );

  router.get(
    "/homepage",
    catchAsyncErrors(async (req, res) => {
      const featureFlags = resolveFeatureFlags();
      if (!runFeatureGuard(featureFlags, "homepage", res, () => true)) return;
      const data = await platform.homepageService.resolvePublicHomepage();
      res.status(200).json({ success: true, data });
    })
  );

  router.get(
    "/search/enriched",
    catchAsyncErrors(async (req, res) => {
      const featureFlags = resolveFeatureFlags();
      if (!runFeatureGuard(featureFlags, "searchIntegration", res, () => true)) return;
      const result = await platform.searchBridge.searchProducts(req.query);
      res.status(200).json({ success: true, data: result });
    })
  );

  router.get(
    "/ai/recommendations",
    catchAsyncErrors(async (req, res) => {
      const featureFlags = resolveFeatureFlags();
      if (!runFeatureGuard(featureFlags, "aiIntegration", res, () => true)) return;
      const data = await platform.aiService.recommend({
        limit: Number(req.query.limit) || 10,
        userId: req.query.userId || null,
      });
      res.status(200).json({ success: true, data });
    })
  );

  router.post(
    "/campaigns/:campaignId/metrics/:metric",
    catchAsyncErrors(async (req, res) => {
      const featureFlags = resolveFeatureFlags();
      if (!runFeatureGuard(featureFlags, "campaigns", res, () => true)) return;
      const amount = Number(req.body.amount) || 1;
      const updated = await platform.campaignService.recordMetric(
        req.params.campaignId,
        req.params.metric,
        amount
      );
      res.status(200).json({ success: true, data: updated });
    })
  );

  router.post(
    "/promotions/validate",
    catchAsyncErrors(async (req, res) => {
      const featureFlags = resolveFeatureFlags();
      if (!runFeatureGuard(featureFlags, "promotions", res, () => true)) return;
      const result = await platform.promotionEngine.validatePromotion(req.body);
      res.status(result.valid ? 200 : 400).json({ success: result.valid, data: result });
    })
  );

  router.post(
    "/automation/run",
    isAuthenticated,
    catchAsyncErrors(async (req, res) => {
      const auth = GrowthCommerceAccess.assertSuperAdmin(req);
      if (!auth.valid) {
        return res.status(auth.statusCode).json({ success: false, reason: auth.reason });
      }
      const featureFlags = resolveFeatureFlags();
      if (!runFeatureGuard(featureFlags, "automation", res, () => true)) return;
      const result = await platform.automationService.processDueCampaigns({
        actor: auth.userId,
        correlationId: req.body?.correlationId || null,
      });
      res.status(200).json({ success: true, data: result });
    })
  );

  router.get(
    "/configuration",
    isAuthenticated,
    catchAsyncErrors(async (req, res) => {
      const auth = GrowthCommerceAccess.assertSuperAdmin(req);
      if (!auth.valid) {
        return res.status(auth.statusCode).json({ success: false, reason: auth.reason });
      }
      res.status(200).json({ success: true, data: { settings: platform.getSettings() } });
    })
  );

  router.put(
    "/configuration",
    isAuthenticated,
    catchAsyncErrors(async (req, res) => {
      const auth = GrowthCommerceAccess.assertSuperAdmin(req);
      if (!auth.valid) {
        return res.status(auth.statusCode).json({ success: false, reason: auth.reason });
      }
      const settings = await platform.updateSettings(req.body?.settings || req.body, {
        admin: auth.userId,
      });
      res.status(200).json({ success: true, data: { settings } });
    })
  );

  router.get(
    "/admin/homepage",
    isAuthenticated,
    catchAsyncErrors(async (req, res) => {
      const auth = GrowthCommerceAccess.assertSuperAdmin(req);
      if (!auth.valid) {
        return res.status(auth.statusCode).json({ success: false, reason: auth.reason });
      }
      const featureFlags = resolveFeatureFlags();
      if (!runFeatureGuard(featureFlags, "homepage", res, () => true)) return;
      const sections = await platform.homepageService.loadSections();
      res.status(200).json({ success: true, data: { sections } });
    })
  );

  router.put(
    "/admin/homepage",
    isAuthenticated,
    catchAsyncErrors(async (req, res) => {
      const auth = GrowthCommerceAccess.assertSuperAdmin(req);
      if (!auth.valid) {
        return res.status(auth.statusCode).json({ success: false, reason: auth.reason });
      }
      const featureFlags = resolveFeatureFlags();
      if (!runFeatureGuard(featureFlags, "homepage", res, () => true)) return;
      const sections = await platform.homepageService.updateSections(req.body?.sections || req.body, {
        admin: auth.userId,
      });
      res.status(200).json({ success: true, data: { sections } });
    })
  );

  router.get(
    "/admin/dashboard",
    isAuthenticated,
    catchAsyncErrors(async (req, res) => {
      const auth = GrowthCommerceAccess.assertSuperAdmin(req);
      if (!auth.valid) {
        return res.status(auth.statusCode).json({ success: false, reason: auth.reason });
      }
      const featureFlags = resolveFeatureFlags();
      if (!runFeatureGuard(featureFlags, "marketingDashboard", res, () => true)) return;
      const data = await platform.marketingDashboard.getAdminDashboard();
      res.status(200).json({ success: true, data });
    })
  );

  router.get(
    "/admin/campaigns",
    isAuthenticated,
    catchAsyncErrors(async (req, res) => {
      const auth = GrowthCommerceAccess.assertSuperAdmin(req);
      if (!auth.valid) {
        return res.status(auth.statusCode).json({ success: false, reason: auth.reason });
      }
      const featureFlags = resolveFeatureFlags();
      if (!runFeatureGuard(featureFlags, "campaigns", res, () => true)) return;
      const campaigns = await platform.campaignService.listCampaigns({
        status: req.query.status,
        type: req.query.type,
        vendorId: req.query.vendorId,
      });
      res.status(200).json({ success: true, data: campaigns });
    })
  );

  router.get(
    "/admin/ambassadors",
    isAuthenticated,
    catchAsyncErrors(async (req, res) => {
      const auth = GrowthCommerceAccess.assertSuperAdmin(req);
      if (!auth.valid) {
        return res.status(auth.statusCode).json({ success: false, reason: auth.reason });
      }
      const featureFlags = resolveFeatureFlags();
      if (!runFeatureGuard(featureFlags, "ambassadors", res, () => true)) return;
      const ambassadors = await platform.affiliateService.listAmbassadors();
      res.status(200).json({ success: true, data: ambassadors });
    })
  );

  router.put(
    "/admin/ambassadors/:userId",
    isAuthenticated,
    catchAsyncErrors(async (req, res) => {
      const auth = GrowthCommerceAccess.assertSuperAdmin(req);
      if (!auth.valid) {
        return res.status(auth.statusCode).json({ success: false, reason: auth.reason });
      }
      const featureFlags = resolveFeatureFlags();
      if (!runFeatureGuard(featureFlags, "ambassadors", res, () => true)) return;
      const ambassador = await platform.affiliateService.upsertAmbassador(req.params.userId, req.body);
      res.status(200).json({ success: true, data: ambassador });
    })
  );

  router.get(
    "/vendor/campaigns",
    isSeller,
    catchAsyncErrors(async (req, res) => {
      const auth = GrowthCommerceAccess.assertVendor(req);
      if (!auth.valid) {
        return res.status(auth.statusCode).json({ success: false, reason: auth.reason });
      }
      const featureFlags = resolveFeatureFlags();
      if (!runFeatureGuard(featureFlags, "campaigns", res, () => true)) return;
      const campaigns = await platform.campaignService.listCampaigns({
        vendorId: auth.vendorId,
        status: req.query.status,
        type: req.query.type,
      });
      res.status(200).json({ success: true, data: campaigns });
    })
  );

  router.post(
    "/vendor/campaigns",
    isSeller,
    catchAsyncErrors(async (req, res) => {
      const auth = GrowthCommerceAccess.assertVendor(req);
      if (!auth.valid) {
        return res.status(auth.statusCode).json({ success: false, reason: auth.reason });
      }
      const featureFlags = resolveFeatureFlags();
      if (!runFeatureGuard(featureFlags, "campaigns", res, () => true)) return;
      const campaign = await platform.campaignService.createCampaign(auth.vendorId, req.body, {
        actor: auth.vendorId,
      });
      res.status(201).json({ success: true, data: campaign });
    })
  );

  router.get(
    "/vendor/campaigns/:campaignId",
    isSeller,
    catchAsyncErrors(async (req, res) => {
      const auth = GrowthCommerceAccess.assertVendor(req);
      if (!auth.valid) {
        return res.status(auth.statusCode).json({ success: false, reason: auth.reason });
      }
      const featureFlags = resolveFeatureFlags();
      if (!runFeatureGuard(featureFlags, "campaigns", res, () => true)) return;
      const campaign = await platform.campaignService.getCampaign(req.params.campaignId, {
        vendorId: auth.vendorId,
      });
      res.status(200).json({ success: true, data: campaign });
    })
  );

  router.put(
    "/vendor/campaigns/:campaignId",
    isSeller,
    catchAsyncErrors(async (req, res) => {
      const auth = GrowthCommerceAccess.assertVendor(req);
      if (!auth.valid) {
        return res.status(auth.statusCode).json({ success: false, reason: auth.reason });
      }
      const featureFlags = resolveFeatureFlags();
      if (!runFeatureGuard(featureFlags, "campaigns", res, () => true)) return;
      const campaign = await platform.campaignService.updateCampaign(
        req.params.campaignId,
        auth.vendorId,
        req.body,
        { actor: auth.vendorId }
      );
      res.status(200).json({ success: true, data: campaign });
    })
  );

  router.post(
    "/vendor/campaigns/:campaignId/status",
    isSeller,
    catchAsyncErrors(async (req, res) => {
      const auth = GrowthCommerceAccess.assertVendor(req);
      if (!auth.valid) {
        return res.status(auth.statusCode).json({ success: false, reason: auth.reason });
      }
      const featureFlags = resolveFeatureFlags();
      if (!runFeatureGuard(featureFlags, "campaigns", res, () => true)) return;
      const campaign = await platform.campaignService.updateStatus(
        req.params.campaignId,
        req.body.status,
        { vendorId: auth.vendorId, actor: auth.vendorId }
      );
      res.status(200).json({ success: true, data: campaign });
    })
  );

  router.post(
    "/vendor/campaigns/:campaignId/duplicate",
    isSeller,
    catchAsyncErrors(async (req, res) => {
      const auth = GrowthCommerceAccess.assertVendor(req);
      if (!auth.valid) {
        return res.status(auth.statusCode).json({ success: false, reason: auth.reason });
      }
      const featureFlags = resolveFeatureFlags();
      if (!runFeatureGuard(featureFlags, "campaigns", res, () => true)) return;
      const campaign = await platform.campaignService.duplicateCampaign(
        auth.vendorId,
        req.params.campaignId,
        { actor: auth.vendorId }
      );
      res.status(201).json({ success: true, data: campaign });
    })
  );

  router.get(
    "/vendor/dashboard",
    isSeller,
    catchAsyncErrors(async (req, res) => {
      const auth = GrowthCommerceAccess.assertVendor(req);
      if (!auth.valid) {
        return res.status(auth.statusCode).json({ success: false, reason: auth.reason });
      }
      const featureFlags = resolveFeatureFlags();
      if (!runFeatureGuard(featureFlags, "marketingDashboard", res, () => true)) return;
      const data = await platform.marketingDashboard.getVendorDashboard(auth.vendorId);
      res.status(200).json({ success: true, data });
    })
  );

  router.get(
    "/affiliate/dashboard",
    isAuthenticated,
    catchAsyncErrors(async (req, res) => {
      const auth = GrowthCommerceAccess.assertUser(req);
      if (!auth.valid) {
        return res.status(auth.statusCode).json({ success: false, reason: auth.reason });
      }
      const featureFlags = resolveFeatureFlags();
      if (!runFeatureGuard(featureFlags, "affiliates", res, () => true)) return;
      const data = await platform.affiliateService.getReferralDashboard(auth.userId);
      res.status(200).json({ success: true, data });
    })
  );

  router.post(
    "/affiliate/link",
    isAuthenticated,
    catchAsyncErrors(async (req, res) => {
      const auth = GrowthCommerceAccess.assertUser(req);
      if (!auth.valid) {
        return res.status(auth.statusCode).json({ success: false, reason: auth.reason });
      }
      const featureFlags = resolveFeatureFlags();
      if (!runFeatureGuard(featureFlags, "affiliates", res, () => true)) return;
      const data = await platform.affiliateService.generateAffiliateLink(
        auth.userId,
        req.body.productId,
        req.body.frontendUrl
      );
      res.status(200).json({ success: true, data });
    })
  );

  router.post(
    "/ambassador/profile",
    isAuthenticated,
    catchAsyncErrors(async (req, res) => {
      const auth = GrowthCommerceAccess.assertUser(req);
      if (!auth.valid) {
        return res.status(auth.statusCode).json({ success: false, reason: auth.reason });
      }
      const featureFlags = resolveFeatureFlags();
      if (!runFeatureGuard(featureFlags, "ambassadors", res, () => true)) return;
      const ambassador = await platform.affiliateService.upsertAmbassador(auth.userId, req.body);
      res.status(200).json({ success: true, data: ambassador });
    })
  );

  router.post(
    "/ambassador/campaigns/:campaignId/assign",
    isAuthenticated,
    catchAsyncErrors(async (req, res) => {
      const auth = GrowthCommerceAccess.assertUser(req);
      if (!auth.valid) {
        return res.status(auth.statusCode).json({ success: false, reason: auth.reason });
      }
      const featureFlags = resolveFeatureFlags();
      if (!runFeatureGuard(featureFlags, "ambassadors", res, () => true)) return;
      const ambassador = await platform.affiliateService.assignCampaign(auth.userId, req.params.campaignId);
      res.status(200).json({ success: true, data: ambassador });
    })
  );

  app.use("/api/v2/marketplace/growth-commerce", router);
  return platform;
}

module.exports = {
  GrowthCommercePlatform,
  createGrowthCommercePlatform,
  getGrowthCommercePlatform,
  registerGrowthCommercePlatform,
};
