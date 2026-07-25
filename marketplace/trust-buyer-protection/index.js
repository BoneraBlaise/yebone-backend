const express = require("express");
const catchAsyncErrors = require("../../middleware/catchAsyncErrors");
const { isAuthenticated } = require("../../middleware/auth");
const TrustBuyerProtectionPlatform = require("./TrustBuyerProtectionPlatform");
const TrustBuyerProtectionAccess = require("./TrustBuyerProtectionAccess");

let trustBuyerProtectionPlatformInstance = null;

function createTrustBuyerProtectionPlatform(options = {}) {
  trustBuyerProtectionPlatformInstance = new TrustBuyerProtectionPlatform(options);
  return trustBuyerProtectionPlatformInstance;
}

function getTrustBuyerProtectionPlatform() {
  if (!trustBuyerProtectionPlatformInstance) {
    throw new Error(
      "Trust Buyer Protection platform not initialized — call registerTrustBuyerProtectionPlatform first"
    );
  }
  return trustBuyerProtectionPlatformInstance;
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
    if (featureFlags) TrustBuyerProtectionAccess.assertFeatureEnabled(featureFlags, key);
    return fn();
  } catch (error) {
    if (error.reason === "FEATURE_DISABLED") {
      respondGuardFailure(res, error);
      return false;
    }
    throw error;
  }
}

function resolveFeatureFlags() {
  try {
    const { getPlatformIntegration } = require("../integration/PlatformIntegration");
    return getPlatformIntegration().featureFlags;
  } catch (_error) {
    return null;
  }
}

function registerTrustBuyerProtectionPlatform(app, options = {}) {
  const platform = createTrustBuyerProtectionPlatform(options);

  if (!options.useMemoryOnly) {
    try {
      platform.setModels({ ConfigModel: require("../../model/trustBuyerProtectionConfig") });
    } catch (_error) {
      // isolated tests
    }
    try {
      const { getOrderPlatform } = require("../orders");
      platform.bindOrderPlatform(getOrderPlatform());
    } catch (_error) {
      // optional during isolated tests
    }
  }

  platform.initialize().catch((error) => {
    console.error("[TrustBuyerProtection] initialize failed:", error.message);
  });

  app.locals.trustBuyerProtectionPlatform = platform;

  const router = express.Router();

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
        data: {
          settings: platform.getSettings(),
          policies: platform.getPolicies(),
          trustWeights: platform.getTrustWeights(),
        },
      });
    })
  );

  router.get(
    "/configuration",
    isAuthenticated,
    catchAsyncErrors(async (req, res) => {
      const auth = TrustBuyerProtectionAccess.assertSuperAdmin(req);
      if (!auth.valid) return res.status(auth.statusCode).json({ success: false, reason: auth.reason });
      res.status(200).json({
        success: true,
        data: {
          settings: platform.getSettings(),
          policies: platform.getPolicies(),
          trustWeights: platform.getTrustWeights(),
        },
      });
    })
  );

  router.put(
    "/configuration",
    isAuthenticated,
    catchAsyncErrors(async (req, res) => {
      const auth = TrustBuyerProtectionAccess.assertSuperAdmin(req);
      if (!auth.valid) return res.status(auth.statusCode).json({ success: false, reason: auth.reason });
      const config = await platform.updateConfiguration(req.body, { admin: auth.userId });
      res.status(200).json({ success: true, data: config });
    })
  );

  router.get(
    "/admin/dashboard",
    isAuthenticated,
    catchAsyncErrors(async (req, res) => {
      const auth = TrustBuyerProtectionAccess.assertSuperAdmin(req);
      if (!auth.valid) return res.status(auth.statusCode).json({ success: false, reason: auth.reason });
      const featureFlags = resolveFeatureFlags();
      if (!runFeatureGuard(featureFlags, "analytics", res, () => true)) return;
      const data = await platform.analyticsService.getAdminDashboard();
      res.status(200).json({ success: true, data });
    })
  );

  router.get(
    "/admin/disputes",
    isAuthenticated,
    catchAsyncErrors(async (req, res) => {
      const auth = TrustBuyerProtectionAccess.assertSuperAdmin(req);
      if (!auth.valid) return res.status(auth.statusCode).json({ success: false, reason: auth.reason });
      const featureFlags = resolveFeatureFlags();
      if (!runFeatureGuard(featureFlags, "disputes", res, () => true)) return;
      const data = await platform.disputeService.listDisputes({ status: req.query.status });
      res.status(200).json({ success: true, data });
    })
  );

  router.post(
    "/admin/disputes/:disputeId/transition",
    isAuthenticated,
    catchAsyncErrors(async (req, res) => {
      const auth = TrustBuyerProtectionAccess.assertSuperAdmin(req);
      if (!auth.valid) return res.status(auth.statusCode).json({ success: false, reason: auth.reason });
      const featureFlags = resolveFeatureFlags();
      if (!runFeatureGuard(featureFlags, "disputes", res, () => true)) return;
      const data = await platform.disputeService.transitionDispute(req.params.disputeId, req.body.status, {
        actor: auth.userId,
        note: req.body.note,
        resolution: req.body.resolution,
        assignedAdmin: req.body.assignedAdmin || auth.userId,
      });
      res.status(200).json({ success: true, data });
    })
  );

  router.get(
    "/admin/escrow",
    isAuthenticated,
    catchAsyncErrors(async (req, res) => {
      const auth = TrustBuyerProtectionAccess.assertSuperAdmin(req);
      if (!auth.valid) return res.status(auth.statusCode).json({ success: false, reason: auth.reason });
      const featureFlags = resolveFeatureFlags();
      if (!runFeatureGuard(featureFlags, "escrow", res, () => true)) return;
      const data = await platform.escrowService.listEscrows({ status: req.query.status });
      res.status(200).json({ success: true, data });
    })
  );

  router.post(
    "/admin/escrow/:escrowId/transition",
    isAuthenticated,
    catchAsyncErrors(async (req, res) => {
      const auth = TrustBuyerProtectionAccess.assertSuperAdmin(req);
      if (!auth.valid) return res.status(auth.statusCode).json({ success: false, reason: auth.reason });
      const featureFlags = resolveFeatureFlags();
      if (!runFeatureGuard(featureFlags, "escrow", res, () => true)) return;
      const data = await platform.escrowService.transitionEscrow(req.params.escrowId, req.body.status, {
        actor: auth.userId,
        note: req.body.note,
        adminOverride: true,
        reason: req.body.reason,
      });
      res.status(200).json({ success: true, data });
    })
  );

  router.get(
    "/admin/verification",
    isAuthenticated,
    catchAsyncErrors(async (req, res) => {
      const auth = TrustBuyerProtectionAccess.assertSuperAdmin(req);
      if (!auth.valid) return res.status(auth.statusCode).json({ success: false, reason: auth.reason });
      const featureFlags = resolveFeatureFlags();
      if (!runFeatureGuard(featureFlags, "verification", res, () => true)) return;
      const data = await platform.verificationService.listVerifications({
        status: req.query.status,
        subjectType: req.query.subjectType,
      });
      res.status(200).json({ success: true, data });
    })
  );

  router.post(
    "/admin/verification/:verificationId/review",
    isAuthenticated,
    catchAsyncErrors(async (req, res) => {
      const auth = TrustBuyerProtectionAccess.assertSuperAdmin(req);
      if (!auth.valid) return res.status(auth.statusCode).json({ success: false, reason: auth.reason });
      const featureFlags = resolveFeatureFlags();
      if (!runFeatureGuard(featureFlags, "verification", res, () => true)) return;
      const data = await platform.verificationService.reviewVerification(
        req.params.verificationId,
        req.body.decision,
        { actor: auth.userId }
      );
      res.status(200).json({ success: true, data });
    })
  );

  router.get(
    "/admin/trust-scores",
    isAuthenticated,
    catchAsyncErrors(async (req, res) => {
      const auth = TrustBuyerProtectionAccess.assertSuperAdmin(req);
      if (!auth.valid) return res.status(auth.statusCode).json({ success: false, reason: auth.reason });
      const featureFlags = resolveFeatureFlags();
      if (!runFeatureGuard(featureFlags, "trustScore", res, () => true)) return;
      const data = await platform.trustScoreService.listTrustScores();
      res.status(200).json({ success: true, data });
    })
  );

  router.get(
    "/admin/fraud-alerts",
    isAuthenticated,
    catchAsyncErrors(async (req, res) => {
      const auth = TrustBuyerProtectionAccess.assertSuperAdmin(req);
      if (!auth.valid) return res.status(auth.statusCode).json({ success: false, reason: auth.reason });
      const featureFlags = resolveFeatureFlags();
      if (!runFeatureGuard(featureFlags, "fraud", res, () => true)) return;
      const data = await platform.fraudDetectionService.listAlerts({
        status: req.query.status,
        riskLevel: req.query.riskLevel,
      });
      res.status(200).json({ success: true, data });
    })
  );

  router.post(
    "/admin/fraud-alerts/:alertId/review",
    isAuthenticated,
    catchAsyncErrors(async (req, res) => {
      const auth = TrustBuyerProtectionAccess.assertSuperAdmin(req);
      if (!auth.valid) return res.status(auth.statusCode).json({ success: false, reason: auth.reason });
      const data = await platform.fraudDetectionService.reviewAlert(req.params.alertId, req.body.status, {
        actor: auth.userId,
      });
      res.status(200).json({ success: true, data });
    })
  );

  router.get(
    "/admin/policies",
    isAuthenticated,
    catchAsyncErrors(async (req, res) => {
      const auth = TrustBuyerProtectionAccess.assertSuperAdmin(req);
      if (!auth.valid) return res.status(auth.statusCode).json({ success: false, reason: auth.reason });
      res.status(200).json({
        success: true,
        data: {
          policies: platform.getPolicies(),
          trustWeights: platform.getTrustWeights(),
        },
      });
    })
  );

  router.put(
    "/admin/policies",
    isAuthenticated,
    catchAsyncErrors(async (req, res) => {
      const auth = TrustBuyerProtectionAccess.assertSuperAdmin(req);
      if (!auth.valid) return res.status(auth.statusCode).json({ success: false, reason: auth.reason });
      const featureFlags = resolveFeatureFlags();
      if (!runFeatureGuard(featureFlags, "policies", res, () => true)) return;
      if (req.body.policies) {
        await platform.policyService.updatePolicies(req.body.policies, { admin: auth.userId });
      }
      if (req.body.trustWeights) {
        await platform.policyService.updateTrustWeights(req.body.trustWeights, { admin: auth.userId });
      }
      res.status(200).json({
        success: true,
        data: {
          policies: platform.getPolicies(),
          trustWeights: platform.getTrustWeights(),
        },
      });
    })
  );

  router.get(
    "/protection/:orderId/eligibility",
    isAuthenticated,
    catchAsyncErrors(async (req, res) => {
      const auth = TrustBuyerProtectionAccess.assertAuthenticated(req);
      if (!auth.valid) return res.status(auth.statusCode).json({ success: false, reason: auth.reason });
      const featureFlags = resolveFeatureFlags();
      if (!runFeatureGuard(featureFlags, "buyerProtection", res, () => true)) return;
      const data = await platform.buyerProtectionService.checkEligibility(req.params.orderId, {
        actor: auth.userId,
      });
      res.status(200).json({ success: true, data });
    })
  );

  router.get(
    "/protection/:orderId",
    isAuthenticated,
    catchAsyncErrors(async (req, res) => {
      const auth = TrustBuyerProtectionAccess.assertAuthenticated(req);
      if (!auth.valid) return res.status(auth.statusCode).json({ success: false, reason: auth.reason });
      const data = await platform.buyerProtectionService.getProtectionStatus(req.params.orderId);
      res.status(200).json({ success: true, data });
    })
  );

  router.post(
    "/buyer/disputes",
    isAuthenticated,
    catchAsyncErrors(async (req, res) => {
      const auth = TrustBuyerProtectionAccess.assertBuyer(req);
      if (!auth.valid) return res.status(auth.statusCode).json({ success: false, reason: auth.reason });
      const featureFlags = resolveFeatureFlags();
      if (!runFeatureGuard(featureFlags, "disputes", res, () => true)) return;
      const data = await platform.disputeService.openDispute(auth.buyerId, req.body, { actor: auth.buyerId });
      res.status(201).json({ success: true, data });
    })
  );

  router.get(
    "/buyer/disputes/:disputeId",
    isAuthenticated,
    catchAsyncErrors(async (req, res) => {
      const auth = TrustBuyerProtectionAccess.assertBuyer(req);
      if (!auth.valid) return res.status(auth.statusCode).json({ success: false, reason: auth.reason });
      const data = await platform.disputeService.getDispute(req.params.disputeId, {
        requesterId: auth.buyerId,
      });
      res.status(200).json({ success: true, data });
    })
  );

  router.post(
    "/verification/submit",
    isAuthenticated,
    catchAsyncErrors(async (req, res) => {
      const auth = TrustBuyerProtectionAccess.assertAuthenticated(req);
      if (!auth.valid) return res.status(auth.statusCode).json({ success: false, reason: auth.reason });
      const featureFlags = resolveFeatureFlags();
      if (!runFeatureGuard(featureFlags, "verification", res, () => true)) return;
      const data = await platform.verificationService.submitVerification(auth.userId, req.body, {
        actor: auth.userId,
      });
      res.status(201).json({ success: true, data });
    })
  );

  router.get(
    "/verification/status",
    isAuthenticated,
    catchAsyncErrors(async (req, res) => {
      const auth = TrustBuyerProtectionAccess.assertAuthenticated(req);
      if (!auth.valid) return res.status(auth.statusCode).json({ success: false, reason: auth.reason });
      const data = await platform.verificationService.getVerificationStatus(
        auth.userId,
        req.query.subjectType || "customer"
      );
      res.status(200).json({ success: true, data });
    })
  );

  router.get(
    "/trust-score/:subjectId",
    isAuthenticated,
    catchAsyncErrors(async (req, res) => {
      const auth = TrustBuyerProtectionAccess.assertAuthenticated(req);
      if (!auth.valid) return res.status(auth.statusCode).json({ success: false, reason: auth.reason });
      const featureFlags = resolveFeatureFlags();
      if (!runFeatureGuard(featureFlags, "trustScore", res, () => true)) return;
      const data = await platform.trustScoreService.getTrustScore(req.params.subjectId);
      res.status(200).json({ success: true, data });
    })
  );

  app.use("/api/v2/marketplace/trust-buyer-protection", router);

  return platform;
}

module.exports = {
  createTrustBuyerProtectionPlatform,
  getTrustBuyerProtectionPlatform,
  registerTrustBuyerProtectionPlatform,
};
