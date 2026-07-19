const express = require("express");
const catchAsyncErrors = require("../../middleware/catchAsyncErrors");
const { isAuthenticated } = require("../../middleware/auth");
const GrowthPlatform = require("./GrowthPlatform");
const GrowthConfigurationPlatform = require("./GrowthConfigurationPlatform");
const GrowthAdminAccess = require("./GrowthAdminAccess");

let growthPlatformInstance = null;

function createGrowthPlatform(options = {}) {
  growthPlatformInstance = new GrowthPlatform(options);
  return growthPlatformInstance;
}

function getGrowthPlatform() {
  if (!growthPlatformInstance) {
    throw new Error("Growth platform not initialized — call registerGrowthPlatform first");
  }
  return growthPlatformInstance;
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

function registerGrowthConfigurationPlatform(app, options = {}) {
  const storeOptions = {
    useMemoryOnly: Boolean(options.useMemoryOnly),
    dataDir: options.dataDir,
  };

  const configPlatform = new GrowthConfigurationPlatform({ ...options, storeOptions });

  if (!options.useMemoryOnly) {
    try {
      const GrowthConfigurationModel = require("../../model/growthConfiguration");
      configPlatform.store.setModel(GrowthConfigurationModel);
    } catch (_error) {
      // isolated tests
    }
  }

  configPlatform.store.initializeSync();

  if (!options.useMemoryOnly) {
    const mongoose = require("mongoose");
    const reloadFromMongo = () => {
      if (mongoose.connection?.readyState === 1 && configPlatform.store.GrowthConfigurationModel) {
        configPlatform.store.scheduleMongoReload();
        configPlatform.initialize().catch((error) => {
          console.error("[GrowthConfig] Mongo reload failed:", error.message);
        });
      }
    };
    if (mongoose.connection?.readyState === 1) reloadFromMongo();
    else mongoose.connection?.once("connected", reloadFromMongo);
  }

  return configPlatform;
}

function registerGrowthPlatform(app, options = {}) {
  const configPlatform =
    options.configPlatform || registerGrowthConfigurationPlatform(app, options);
  const platform = createGrowthPlatform({ ...options, configPlatform });
  platform.initialize().catch((error) => {
    console.error("[GrowthPlatform] initialize failed:", error.message);
  });
  app.locals.growthPlatform = platform;

  const router = express.Router();
  const guard = platform.getGuard();

  router.get(
    "/health",
    catchAsyncErrors(async (_req, res) => {
      res.status(200).json({ success: true, data: platform.health() });
    })
  );

  router.get(
    "/features",
    catchAsyncErrors(async (_req, res) => {
      res.status(200).json({
        success: true,
        data: platform.getConfigurationPlatform().getFeatures(),
      });
    })
  );

  router.get(
    "/configuration",
    isAuthenticated,
    catchAsyncErrors(async (req, res) => {
      const auth = GrowthAdminAccess.assertSuperAdmin(req);
      if (!auth.valid) {
        return res.status(auth.statusCode).json({ success: false, reason: auth.reason });
      }
      res.status(200).json({
        success: true,
        data: platform.getConfigurationPlatform().getConfiguration(),
      });
    })
  );

  router.put(
    "/configuration",
    isAuthenticated,
    catchAsyncErrors(async (req, res) => {
      const auth = GrowthAdminAccess.assertSuperAdmin(req);
      if (!auth.valid) {
        return res.status(auth.statusCode).json({ success: false, reason: auth.reason });
      }
      const result = await platform.getConfigurationPlatform().updateConfiguration(req.body, {
        admin: auth.userId,
        reason: req.body?.reason || null,
      });
      res.status(200).json({ success: true, data: result });
    })
  );

  router.get(
    "/configuration/audit",
    isAuthenticated,
    catchAsyncErrors(async (req, res) => {
      const auth = GrowthAdminAccess.assertSuperAdmin(req);
      if (!auth.valid) {
        return res.status(auth.statusCode).json({ success: false, reason: auth.reason });
      }
      const limit = Number(req.query.limit) || 100;
      const audit = platform.getConfigurationPlatform().getAuditHistory(limit);
      res.status(200).json({ success: true, data: audit, meta: { count: audit.length } });
    })
  );

  router.get(
    "/audit",
    isAuthenticated,
    catchAsyncErrors(async (req, res) => {
      const auth = GrowthAdminAccess.assertSuperAdmin(req);
      if (!auth.valid) {
        return res.status(auth.statusCode).json({ success: false, reason: auth.reason });
      }
      const limit = Number(req.query.limit) || 100;
      const audit = platform.getConfigurationPlatform().getAuditHistory(limit);
      res.status(200).json({ success: true, data: audit, meta: { count: audit.length } });
    })
  );

  router.get(
    "/referral",
    isAuthenticated,
    catchAsyncErrors(async (req, res) => {
      if (!runGuard(() => guard.assertReferralEnabled(), res)) return;
      const profile = await platform.getReferralProfile(req.user._id);
      res.status(200).json({ success: true, data: profile });
    })
  );

  router.post(
    "/referral",
    isAuthenticated,
    catchAsyncErrors(async (req, res) => {
      if (!runGuard(() => guard.assertReferralEnabled(), res)) return;
      const result = await platform.joinReferralProgram(req.user._id);
      res.status(201).json({ success: true, data: result, message: "Successfully joined referral program" });
    })
  );

  router.post(
    "/referral/attribution",
    isAuthenticated,
    catchAsyncErrors(async (req, res) => {
      if (!runGuard(() => guard.assertReferralEnabled(), res)) return;
      const token = platform.createAttributionToken({
        referralCode: req.body.referralCode,
        productId: req.body.productId,
        shopId: req.body.shopId,
      });
      res.status(200).json({ success: true, data: { attributionToken: token } });
    })
  );

  router.post(
    "/referral/track-click",
    catchAsyncErrors(async (req, res) => {
      if (!runGuard(() => guard.assertReferralEnabled(), res)) return;
      const result = await platform.trackReferralClick(req.body.referralCode);
      res.status(200).json({ success: true, data: result });
    })
  );

  router.post(
    "/validate-coupon",
    catchAsyncErrors(async (req, res) => {
      if (!runGuard(() => guard.assertCouponEnabled(), res)) return;
      const result = await platform.validateCoupon(req.body);
      res.status(result.valid ? 200 : 400).json({ success: result.valid, data: result });
    })
  );

  router.post(
    "/validate-promotion",
    catchAsyncErrors(async (req, res) => {
      if (!runGuard(() => guard.assertPromotionEnabled(), res)) return;
      const result = req.body.unified
        ? await platform.validatePromotion({ ...req.body, unified: true })
        : await platform.validatePromotion(req.body);
      res.status(result.valid ? 200 : 400).json({ success: result.valid, data: result });
    })
  );

  const assertAdmin = (req, res) => {
    const auth = GrowthAdminAccess.assertSuperAdmin(req);
    if (!auth.valid) {
      res.status(auth.statusCode).json({ success: false, reason: auth.reason });
      return null;
    }
    return auth;
  };

  router.get(
    "/commission-rules",
    isAuthenticated,
    catchAsyncErrors(async (req, res) => {
      const auth = assertAdmin(req, res);
      if (!auth) return;
      if (!runGuard(() => guard.assertCommissionRulesEnabled(), res)) return;
      const data = platform.getCommissionRuleAdmin().list({
        search: req.query.search,
        strategy: req.query.strategy,
        status: req.query.status,
        includeArchived: req.query.includeArchived === "true",
        sortBy: req.query.sortBy,
        sortDir: req.query.sortDir,
        page: req.query.page,
        limit: req.query.limit,
      });
      res.status(200).json({ success: true, data });
    })
  );

  router.get(
    "/commission-rules/:id",
    isAuthenticated,
    catchAsyncErrors(async (req, res) => {
      const auth = assertAdmin(req, res);
      if (!auth) return;
      const rule = platform.getCommissionRuleAdmin().getById(req.params.id);
      if (!rule) return res.status(404).json({ success: false, reason: "NOT_FOUND" });
      res.status(200).json({ success: true, data: rule });
    })
  );

  router.post(
    "/commission-rules",
    isAuthenticated,
    catchAsyncErrors(async (req, res) => {
      const auth = assertAdmin(req, res);
      if (!auth) return;
      if (!runGuard(() => guard.assertCommissionRulesEnabled(), res)) return;
      const rule = await platform.getCommissionRuleAdmin().create(req.body, {
        admin: auth.userId,
        reason: req.body.reason,
      });
      res.status(201).json({ success: true, data: rule });
    })
  );

  router.put(
    "/commission-rules/:id",
    isAuthenticated,
    catchAsyncErrors(async (req, res) => {
      const auth = assertAdmin(req, res);
      if (!auth) return;
      const rule = await platform.getCommissionRuleAdmin().update(req.params.id, req.body, {
        admin: auth.userId,
        reason: req.body.reason,
      });
      res.status(200).json({ success: true, data: rule });
    })
  );

  router.delete(
    "/commission-rules/:id",
    isAuthenticated,
    catchAsyncErrors(async (req, res) => {
      const auth = assertAdmin(req, res);
      if (!auth) return;
      const rule = await platform.getCommissionRuleAdmin().delete(req.params.id, {
        admin: auth.userId,
        reason: req.body?.reason,
      });
      res.status(200).json({ success: true, data: rule });
    })
  );

  router.post(
    "/commission-rules/:id/duplicate",
    isAuthenticated,
    catchAsyncErrors(async (req, res) => {
      const auth = assertAdmin(req, res);
      if (!auth) return;
      const rule = await platform.getCommissionRuleAdmin().duplicate(req.params.id, {
        admin: auth.userId,
        reason: req.body?.reason,
      });
      res.status(201).json({ success: true, data: rule });
    })
  );

  router.post(
    "/commission-rules/:id/archive",
    isAuthenticated,
    catchAsyncErrors(async (req, res) => {
      const auth = assertAdmin(req, res);
      if (!auth) return;
      const rule = await platform.getCommissionRuleAdmin().archive(req.params.id, {
        admin: auth.userId,
        reason: req.body?.reason,
      });
      res.status(200).json({ success: true, data: rule });
    })
  );

  router.post(
    "/commission-rules/:id/restore",
    isAuthenticated,
    catchAsyncErrors(async (req, res) => {
      const auth = assertAdmin(req, res);
      if (!auth) return;
      const rule = await platform.getCommissionRuleAdmin().restore(req.params.id, {
        admin: auth.userId,
        reason: req.body?.reason,
      });
      res.status(200).json({ success: true, data: rule });
    })
  );

  router.post(
    "/commission-rules/bulk/enable",
    isAuthenticated,
    catchAsyncErrors(async (req, res) => {
      const auth = assertAdmin(req, res);
      if (!auth) return;
      const rules = await platform.getCommissionRuleAdmin().bulkEnable(req.body.ids || [], {
        admin: auth.userId,
        reason: req.body?.reason,
      });
      res.status(200).json({ success: true, data: rules });
    })
  );

  router.post(
    "/commission-rules/bulk/disable",
    isAuthenticated,
    catchAsyncErrors(async (req, res) => {
      const auth = assertAdmin(req, res);
      if (!auth) return;
      const rules = await platform.getCommissionRuleAdmin().bulkDisable(req.body.ids || [], {
        admin: auth.userId,
        reason: req.body?.reason,
      });
      res.status(200).json({ success: true, data: rules });
    })
  );

  router.post(
    "/commission-rules/bulk/delete",
    isAuthenticated,
    catchAsyncErrors(async (req, res) => {
      const auth = assertAdmin(req, res);
      if (!auth) return;
      const rules = await platform.getCommissionRuleAdmin().bulkDelete(req.body.ids || [], {
        admin: auth.userId,
        reason: req.body?.reason,
      });
      res.status(200).json({ success: true, data: rules });
    })
  );

  router.put(
    "/commission-rules/priorities",
    isAuthenticated,
    catchAsyncErrors(async (req, res) => {
      const auth = assertAdmin(req, res);
      if (!auth) return;
      const rules = await platform.getCommissionRuleAdmin().updatePriorities(req.body.priorities || [], {
        admin: auth.userId,
        reason: req.body?.reason,
      });
      res.status(200).json({ success: true, data: rules });
    })
  );

  router.post(
    "/commission-rules/simulate",
    isAuthenticated,
    catchAsyncErrors(async (req, res) => {
      const auth = assertAdmin(req, res);
      if (!auth) return;
      if (!runGuard(() => guard.assertCommissionRulesEnabled(), res)) return;
      const result = platform.simulateCommissionRule(req.body);
      res.status(result.valid ? 200 : 400).json({ success: result.valid, data: result });
    })
  );

  router.get(
    "/commission-analytics",
    isAuthenticated,
    catchAsyncErrors(async (req, res) => {
      const auth = assertAdmin(req, res);
      if (!auth) return;
      res.status(200).json({ success: true, data: platform.getCommissionAnalytics() });
    })
  );

  router.get(
    "/coupons/statistics",
    isAuthenticated,
    catchAsyncErrors(async (req, res) => {
      const auth = assertAdmin(req, res);
      if (!auth) return;
      if (!runGuard(() => guard.assertCouponEnabled(), res)) return;
      const data = await platform.getCouponStatistics();
      res.status(200).json({ success: true, data });
    })
  );

  router.get(
    "/coupons/usage",
    isAuthenticated,
    catchAsyncErrors(async (req, res) => {
      const auth = assertAdmin(req, res);
      if (!auth) return;
      if (!runGuard(() => guard.assertCouponEnabled(), res)) return;
      const data = await platform.getCouponUsage({ limit: Number(req.query.limit) || 100 });
      res.status(200).json({ success: true, data });
    })
  );

  router.get(
    "/reward-ledger",
    isAuthenticated,
    catchAsyncErrors(async (req, res) => {
      if (!runGuard(() => guard.assertRewardLedgerEnabled(), res)) return;
      const ledger = await platform.getRewardLedger(req.user._id, {
        limit: Number(req.query.limit) || 100,
      });
      res.status(200).json({ success: true, data: ledger });
    })
  );

  app.use("/api/v2/marketplace/growth", router);
  return platform;
}

module.exports = {
  GrowthPlatform,
  GrowthConfigurationPlatform,
  createGrowthPlatform,
  getGrowthPlatform,
  registerGrowthConfigurationPlatform,
  registerGrowthPlatform,
  respondGuardFailure,
  runGuard,
};
