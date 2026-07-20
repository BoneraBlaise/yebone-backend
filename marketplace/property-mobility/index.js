const express = require("express");
const catchAsyncErrors = require("../../middleware/catchAsyncErrors");
const { isAuthenticated, isSeller } = require("../../middleware/auth");
const PropertyMobilityPlatform = require("./PropertyMobilityPlatform");
const PropertyMobilityAccess = require("./PropertyMobilityAccess");

let propertyMobilityPlatformInstance = null;

function createPropertyMobilityPlatform(options = {}) {
  propertyMobilityPlatformInstance = new PropertyMobilityPlatform(options);
  return propertyMobilityPlatformInstance;
}

function getPropertyMobilityPlatform() {
  if (!propertyMobilityPlatformInstance) {
    throw new Error("Property Mobility platform not initialized — call registerPropertyMobilityPlatform first");
  }
  return propertyMobilityPlatformInstance;
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
    if (featureFlags) PropertyMobilityAccess.assertFeatureEnabled(featureFlags, key);
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

function registerPropertyMobilityPlatform(app, options = {}) {
  const platform = createPropertyMobilityPlatform(options);

  if (!options.useMemoryOnly) {
    try {
      platform.setModels({ ConfigModel: require("../../model/propertyMobilityConfig") });
    } catch (_error) {
      // isolated tests
    }
  }

  platform.initialize().catch((error) => {
    console.error("[PropertyMobility] initialize failed:", error.message);
  });

  app.locals.propertyMobilityPlatform = platform;

  const router = express.Router();

  router.get("/health", catchAsyncErrors(async (_req, res) => {
    res.status(200).json({ success: true, data: platform.health() });
  }));

  router.get("/features", catchAsyncErrors(async (_req, res) => {
    res.status(200).json({
      success: true,
      data: { settings: platform.getSettings(), pricing: platform.getPricing(), featureToggles: platform.getFeatureToggles() },
    });
  }));

  router.get("/search", catchAsyncErrors(async (req, res) => {
    const featureFlags = resolveFeatureFlags();
    if (!runFeatureGuard(featureFlags, "search", res, () => true)) return;
    const data = await platform.searchBridge.searchListings({ ...req.query, searchBoostFirst: true });
    res.status(200).json({ success: true, data });
  }));

  router.get("/homepage", catchAsyncErrors(async (_req, res) => {
    const featureFlags = resolveFeatureFlags();
    if (!runFeatureGuard(featureFlags, "promotions", res, () => true)) return;
    const listings = await platform.promotionBridge.getHomepageListings();
    res.status(200).json({ success: true, data: { listings } });
  }));

  router.get("/listings/:listingId", catchAsyncErrors(async (req, res) => {
    const featureFlags = resolveFeatureFlags();
    if (!runFeatureGuard(featureFlags, "listings", res, () => true)) return;
    const listing = await platform.listingService.getPublicListing(req.params.listingId);
    if (!listing) return res.status(404).json({ success: false, reason: "NOT_FOUND" });
    res.status(200).json({ success: true, data: listing });
  }));

  router.get("/configuration", isAuthenticated, catchAsyncErrors(async (req, res) => {
    const auth = PropertyMobilityAccess.assertSuperAdmin(req);
    if (!auth.valid) return res.status(auth.statusCode).json({ success: false, reason: auth.reason });
    res.status(200).json({
      success: true,
      data: { settings: platform.getSettings(), pricing: platform.getPricing(), featureToggles: platform.getFeatureToggles() },
    });
  }));

  router.put("/configuration", isAuthenticated, catchAsyncErrors(async (req, res) => {
    const auth = PropertyMobilityAccess.assertSuperAdmin(req);
    if (!auth.valid) return res.status(auth.statusCode).json({ success: false, reason: auth.reason });
    const config = await platform.updateConfiguration(req.body, { admin: auth.userId });
    res.status(200).json({ success: true, data: config });
  }));

  router.get("/admin/dashboard", isAuthenticated, catchAsyncErrors(async (req, res) => {
    const auth = PropertyMobilityAccess.assertSuperAdmin(req);
    if (!auth.valid) return res.status(auth.statusCode).json({ success: false, reason: auth.reason });
    const featureFlags = resolveFeatureFlags();
    if (!runFeatureGuard(featureFlags, "moderation", res, () => true)) return;
    const data = await platform.moderationService.getAdminDashboard();
    res.status(200).json({ success: true, data });
  }));

  router.get("/admin/listings", isAuthenticated, catchAsyncErrors(async (req, res) => {
    const auth = PropertyMobilityAccess.assertSuperAdmin(req);
    if (!auth.valid) return res.status(auth.statusCode).json({ success: false, reason: auth.reason });
    const data = await platform.repository.listListings({ status: req.query.status });
    res.status(200).json({ success: true, data });
  }));

  router.post("/admin/listings/:listingId/:action", isAuthenticated, catchAsyncErrors(async (req, res) => {
    const auth = PropertyMobilityAccess.assertSuperAdmin(req);
    if (!auth.valid) return res.status(auth.statusCode).json({ success: false, reason: auth.reason });
    const featureFlags = resolveFeatureFlags();
    if (!runFeatureGuard(featureFlags, "moderation", res, () => true)) return;
    const data = await platform.moderationService.moderateListing(auth.userId, req.params.listingId, req.params.action, { actor: auth.userId });
    res.status(200).json({ success: true, data });
  }));

  router.post("/admin/owners/:ownerId/verify", isAuthenticated, catchAsyncErrors(async (req, res) => {
    const auth = PropertyMobilityAccess.assertSuperAdmin(req);
    if (!auth.valid) return res.status(auth.statusCode).json({ success: false, reason: auth.reason });
    const data = await platform.moderationService.verifyOwner(auth.userId, req.params.ownerId, req.body, { actor: auth.userId });
    res.status(200).json({ success: true, data });
  }));

  router.get("/admin/reports", isAuthenticated, catchAsyncErrors(async (req, res) => {
    const auth = PropertyMobilityAccess.assertSuperAdmin(req);
    if (!auth.valid) return res.status(auth.statusCode).json({ success: false, reason: auth.reason });
    const data = await platform.reportService.listReports({ status: req.query.status });
    res.status(200).json({ success: true, data });
  }));

  router.post("/admin/reports/:reportId/status", isAuthenticated, catchAsyncErrors(async (req, res) => {
    const auth = PropertyMobilityAccess.assertSuperAdmin(req);
    if (!auth.valid) return res.status(auth.statusCode).json({ success: false, reason: auth.reason });
    const data = await platform.moderationService.moderateReport(auth.userId, req.params.reportId, req.body.status, req.body.adminNotes, { actor: auth.userId });
    res.status(200).json({ success: true, data });
  }));

  const ownerMiddleware = (req, res, next) => {
    if (req.seller?._id || req.user?._id) return next();
    return res.status(401).json({ success: false, reason: "UNAUTHENTICATED" });
  };

  router.get("/owner/listings", ownerMiddleware, catchAsyncErrors(async (req, res) => {
    const auth = PropertyMobilityAccess.assertOwner(req);
    if (!auth.valid) return res.status(auth.statusCode).json({ success: false, reason: auth.reason });
    const featureFlags = resolveFeatureFlags();
    if (!runFeatureGuard(featureFlags, "listings", res, () => true)) return;
    const data = await platform.listingService.listOwnerListings(auth.ownerId);
    res.status(200).json({ success: true, data });
  }));

  router.post("/owner/listings", ownerMiddleware, catchAsyncErrors(async (req, res) => {
    const auth = PropertyMobilityAccess.assertOwner(req);
    if (!auth.valid) return res.status(auth.statusCode).json({ success: false, reason: auth.reason });
    const featureFlags = resolveFeatureFlags();
    if (!runFeatureGuard(featureFlags, "listings", res, () => true)) return;
    const data = await platform.listingService.createListing(auth.ownerId, req.body, { actor: auth.ownerId });
    res.status(201).json({ success: true, data });
  }));

  router.put("/owner/listings/:listingId", ownerMiddleware, catchAsyncErrors(async (req, res) => {
    const auth = PropertyMobilityAccess.assertOwner(req);
    if (!auth.valid) return res.status(auth.statusCode).json({ success: false, reason: auth.reason });
    const data = await platform.listingService.updateListing(auth.ownerId, req.params.listingId, req.body, { actor: auth.ownerId });
    res.status(200).json({ success: true, data });
  }));

  router.post("/owner/listings/:listingId/publish", ownerMiddleware, catchAsyncErrors(async (req, res) => {
    const auth = PropertyMobilityAccess.assertOwner(req);
    if (!auth.valid) return res.status(auth.statusCode).json({ success: false, reason: auth.reason });
    const data = await platform.listingService.publishListing(auth.ownerId, req.params.listingId, { actor: auth.ownerId });
    res.status(200).json({ success: true, data });
  }));

  router.post("/owner/listings/:listingId/pause", ownerMiddleware, catchAsyncErrors(async (req, res) => {
    const auth = PropertyMobilityAccess.assertOwner(req);
    if (!auth.valid) return res.status(auth.statusCode).json({ success: false, reason: auth.reason });
    const data = await platform.listingService.pauseListing(auth.ownerId, req.params.listingId, { actor: auth.ownerId });
    res.status(200).json({ success: true, data });
  }));

  router.delete("/owner/listings/:listingId", ownerMiddleware, catchAsyncErrors(async (req, res) => {
    const auth = PropertyMobilityAccess.assertOwner(req);
    if (!auth.valid) return res.status(auth.statusCode).json({ success: false, reason: auth.reason });
    const data = await platform.listingService.deleteListing(auth.ownerId, req.params.listingId, { actor: auth.ownerId });
    res.status(200).json({ success: true, data });
  }));

  router.post("/owner/listings/:listingId/promote/:type", ownerMiddleware, catchAsyncErrors(async (req, res) => {
    const auth = PropertyMobilityAccess.assertOwner(req);
    if (!auth.valid) return res.status(auth.statusCode).json({ success: false, reason: auth.reason });
    const featureFlags = resolveFeatureFlags();
    if (!runFeatureGuard(featureFlags, "promotions", res, () => true)) return;
    const data = await platform.promotionBridge.applyPromotion(auth.ownerId, req.params.listingId, req.params.type, { actor: auth.ownerId });
    res.status(200).json({ success: true, data });
  }));

  router.post("/owner/verification", ownerMiddleware, catchAsyncErrors(async (req, res) => {
    const auth = PropertyMobilityAccess.assertOwner(req);
    if (!auth.valid) return res.status(auth.statusCode).json({ success: false, reason: auth.reason });
    const featureFlags = resolveFeatureFlags();
    if (!runFeatureGuard(featureFlags, "verification", res, () => true)) return;
    const data = await platform.verificationService.requestVerification(auth.ownerId, req.body, { actor: auth.ownerId });
    res.status(200).json({ success: true, data });
  }));

  router.get("/owner/verification", ownerMiddleware, catchAsyncErrors(async (req, res) => {
    const auth = PropertyMobilityAccess.assertOwner(req);
    if (!auth.valid) return res.status(auth.statusCode).json({ success: false, reason: auth.reason });
    const data = await platform.verificationService.getVerificationStatus(auth.ownerId);
    res.status(200).json({ success: true, data });
  }));

  router.get("/owner/agencies", ownerMiddleware, catchAsyncErrors(async (req, res) => {
    const auth = PropertyMobilityAccess.assertOwner(req);
    if (!auth.valid) return res.status(auth.statusCode).json({ success: false, reason: auth.reason });
    const featureFlags = resolveFeatureFlags();
    if (!runFeatureGuard(featureFlags, "agencies", res, () => true)) return;
    const data = await platform.agencyService.listAgencies(auth.ownerId);
    res.status(200).json({ success: true, data });
  }));

  router.post("/owner/agencies", ownerMiddleware, catchAsyncErrors(async (req, res) => {
    const auth = PropertyMobilityAccess.assertOwner(req);
    if (!auth.valid) return res.status(auth.statusCode).json({ success: false, reason: auth.reason });
    const data = await platform.agencyService.createAgency(auth.ownerId, req.body, { actor: auth.ownerId });
    res.status(201).json({ success: true, data });
  }));

  router.post("/owner/agencies/:agencyId/subscribe", ownerMiddleware, catchAsyncErrors(async (req, res) => {
    const auth = PropertyMobilityAccess.assertOwner(req);
    if (!auth.valid) return res.status(auth.statusCode).json({ success: false, reason: auth.reason });
    const data = await platform.agencyService.subscribeAgency(auth.ownerId, req.params.agencyId, { actor: auth.ownerId });
    res.status(200).json({ success: true, data });
  }));

  router.get("/owner/offers", isSeller, catchAsyncErrors(async (req, res) => {
    const auth = PropertyMobilityAccess.assertOwner(req);
    if (!auth.valid) return res.status(auth.statusCode).json({ success: false, reason: auth.reason });
    const featureFlags = resolveFeatureFlags();
    if (!runFeatureGuard(featureFlags, "offers", res, () => true)) return;
    const data = await platform.offerService.listOffersForOwner(auth.ownerId);
    res.status(200).json({ success: true, data });
  }));

  router.post("/offers", isAuthenticated, catchAsyncErrors(async (req, res) => {
    const auth = PropertyMobilityAccess.assertUser(req);
    if (!auth.valid) return res.status(auth.statusCode).json({ success: false, reason: auth.reason });
    const featureFlags = resolveFeatureFlags();
    if (!runFeatureGuard(featureFlags, "offers", res, () => true)) return;
    const data = await platform.offerService.createOffer(auth.userId, req.body, { actor: auth.userId });
    res.status(201).json({ success: true, data });
  }));

  router.post("/owner/offers/:offerId/:status", isSeller, catchAsyncErrors(async (req, res) => {
    const auth = PropertyMobilityAccess.assertOwner(req);
    if (!auth.valid) return res.status(auth.statusCode).json({ success: false, reason: auth.reason });
    const data = await platform.offerService.respondToOffer(auth.ownerId, req.params.offerId, req.params.status, { actor: auth.ownerId });
    res.status(200).json({ success: true, data });
  }));

  router.post("/reports", isAuthenticated, catchAsyncErrors(async (req, res) => {
    const auth = PropertyMobilityAccess.assertUser(req);
    if (!auth.valid) return res.status(auth.statusCode).json({ success: false, reason: auth.reason });
    const featureFlags = resolveFeatureFlags();
    if (!runFeatureGuard(featureFlags, "reports", res, () => true)) return;
    const data = await platform.reportService.submitReport(auth.userId, req.body, { actor: auth.userId });
    res.status(201).json({ success: true, data });
  }));

  app.use("/api/v2/marketplace/property-mobility", router);
  return platform;
}

module.exports = {
  PropertyMobilityPlatform,
  createPropertyMobilityPlatform,
  getPropertyMobilityPlatform,
  registerPropertyMobilityPlatform,
};
