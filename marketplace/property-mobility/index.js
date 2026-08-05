const express = require("express");
const catchAsyncErrors = require("../../middleware/catchAsyncErrors");
const { isAuthenticated, authenticateVendor } = require("../../middleware/auth");
const PropertyMobilityPlatform = require("./PropertyMobilityPlatform");
const PropertyMobilityAccess = require("./PropertyMobilityAccess");
const { validateCreateListingPayload } = require("./listingPayloadValidation");

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

function respondServiceError(res, error) {
  console.error("[PropertyMobility] Request failed:", {
    message: error.message,
    reason: error.reason,
    statusCode: error.statusCode,
    stack: error.stack,
  });
  return res.status(error.statusCode || 500).json({
    success: false,
    reason: error.reason || "SERVER_ERROR",
    message: error.message || "Something went wrong. Please try again.",
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
      platform.setModels({
        ConfigModel: require("../../model/propertyMobilityConfig"),
        ListingModel: require("../../model/propertyMobilityListing"),
      });
    } catch (_error) {
      // isolated tests
    }
  }

  platform.initialize().catch((error) => {
    console.error("[PropertyMobility] initialize failed:", error.message);
  });

  if (!options.useMemoryOnly && platform.repository) {
    const { migrateListingOwners } = require("./migrateListingOwners");
    migrateListingOwners(platform.repository).catch((err) => {
      console.warn("[PropertyMobility] Owner migration skipped:", err.message);
    });
  }

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
    const data = await platform.moderationService.moderateListing(auth.userId, req.params.listingId, req.params.action, {
      actor: auth.userId,
      adminNotes: req.body?.adminNotes || "",
    });
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

  router.get("/owner/listings", authenticateVendor, catchAsyncErrors(async (req, res) => {
    const auth = PropertyMobilityAccess.assertOwner(req);
    if (!auth.valid) return res.status(auth.statusCode).json({ success: false, reason: auth.reason });
    const featureFlags = resolveFeatureFlags();
    if (!runFeatureGuard(featureFlags, "listings", res, () => true)) return;
    const data = await platform.listingService.listOwnerListings(auth.ownerId);
    res.status(200).json({ success: true, data });
  }));

  router.post("/owner/listings", authenticateVendor, catchAsyncErrors(async (req, res) => {
    const auth = PropertyMobilityAccess.assertOwner(req);
    if (!auth.valid) {
      return res.status(auth.statusCode).json({
        success: false,
        reason: auth.reason,
        message: auth.reason === "UNAUTHENTICATED" ? "Login required." : "Access denied.",
      });
    }
    const featureFlags = resolveFeatureFlags();
    if (!runFeatureGuard(featureFlags, "listings", res, () => true)) return;

    const validationErrors = validateCreateListingPayload(req.body);
    if (validationErrors.length) {
      console.warn("[PropertyMobility] Validation failed:", validationErrors);
      return res.status(400).json({
        success: false,
        reason: "VALIDATION_FAILED",
        message: validationErrors[0].message,
        errors: validationErrors,
      });
    }

    try {
      const data = await platform.listingService.createListing(auth.ownerId, req.body, { actor: auth.ownerId });
      console.info("[PropertyMobility] Listing created:", {
        listingId: data.listingId,
        ownerId: auth.ownerId,
        status: data.status,
        photoCount: data.photos?.length || 0,
      });
      res.status(201).json({ success: true, data });
    } catch (error) {
      return respondServiceError(res, error);
    }
  }));

  router.put("/owner/listings/:listingId", authenticateVendor, catchAsyncErrors(async (req, res) => {
    const auth = PropertyMobilityAccess.assertOwner(req);
    if (!auth.valid) return res.status(auth.statusCode).json({ success: false, reason: auth.reason });
    const data = await platform.listingService.updateListing(auth.ownerId, req.params.listingId, req.body, { actor: auth.ownerId });
    res.status(200).json({ success: true, data });
  }));

  router.post("/owner/listings/:listingId/publish", authenticateVendor, catchAsyncErrors(async (req, res) => {
    const auth = PropertyMobilityAccess.assertOwner(req);
    if (!auth.valid) return res.status(auth.statusCode).json({ success: false, reason: auth.reason });
    const data = await platform.listingService.publishListing(auth.ownerId, req.params.listingId, { actor: auth.ownerId });
    res.status(200).json({ success: true, data });
  }));

  router.post("/owner/listings/:listingId/pause", authenticateVendor, catchAsyncErrors(async (req, res) => {
    const auth = PropertyMobilityAccess.assertOwner(req);
    if (!auth.valid) return res.status(auth.statusCode).json({ success: false, reason: auth.reason });
    const data = await platform.listingService.pauseListing(auth.ownerId, req.params.listingId, { actor: auth.ownerId });
    res.status(200).json({ success: true, data });
  }));

  router.delete("/owner/listings/:listingId", authenticateVendor, catchAsyncErrors(async (req, res) => {
    const auth = PropertyMobilityAccess.assertOwner(req);
    if (!auth.valid) return res.status(auth.statusCode).json({ success: false, reason: auth.reason });
    const data = await platform.listingService.deleteListing(auth.ownerId, req.params.listingId, { actor: auth.ownerId });
    res.status(200).json({ success: true, data });
  }));

  router.post("/owner/listings/:listingId/promote/:type", authenticateVendor, catchAsyncErrors(async (req, res) => {
    const auth = PropertyMobilityAccess.assertOwner(req);
    if (!auth.valid) return res.status(auth.statusCode).json({ success: false, reason: auth.reason });
    const featureFlags = resolveFeatureFlags();
    if (!runFeatureGuard(featureFlags, "promotions", res, () => true)) return;
    const data = await platform.promotionBridge.applyPromotion(auth.ownerId, req.params.listingId, req.params.type, { actor: auth.ownerId });
    res.status(200).json({ success: true, data });
  }));

  router.post("/owner/verification", authenticateVendor, catchAsyncErrors(async (req, res) => {
    const auth = PropertyMobilityAccess.assertOwner(req);
    if (!auth.valid) return res.status(auth.statusCode).json({ success: false, reason: auth.reason });
    const featureFlags = resolveFeatureFlags();
    if (!runFeatureGuard(featureFlags, "verification", res, () => true)) return;
    const data = await platform.verificationService.requestVerification(auth.ownerId, req.body, { actor: auth.ownerId });
    res.status(200).json({ success: true, data });
  }));

  router.get("/owner/verification", authenticateVendor, catchAsyncErrors(async (req, res) => {
    const auth = PropertyMobilityAccess.assertOwner(req);
    if (!auth.valid) return res.status(auth.statusCode).json({ success: false, reason: auth.reason });
    const data = await platform.verificationService.getVerificationStatus(auth.ownerId);
    res.status(200).json({ success: true, data });
  }));

  router.get("/owner/agencies", authenticateVendor, catchAsyncErrors(async (req, res) => {
    const auth = PropertyMobilityAccess.assertOwner(req);
    if (!auth.valid) return res.status(auth.statusCode).json({ success: false, reason: auth.reason });
    const featureFlags = resolveFeatureFlags();
    if (!runFeatureGuard(featureFlags, "agencies", res, () => true)) return;
    const data = await platform.agencyService.listAgencies(auth.ownerId);
    res.status(200).json({ success: true, data });
  }));

  router.post("/owner/agencies", authenticateVendor, catchAsyncErrors(async (req, res) => {
    const auth = PropertyMobilityAccess.assertOwner(req);
    if (!auth.valid) return res.status(auth.statusCode).json({ success: false, reason: auth.reason });
    const data = await platform.agencyService.createAgency(auth.ownerId, req.body, { actor: auth.ownerId });
    res.status(201).json({ success: true, data });
  }));

  router.post("/owner/agencies/:agencyId/subscribe", authenticateVendor, catchAsyncErrors(async (req, res) => {
    const auth = PropertyMobilityAccess.assertOwner(req);
    if (!auth.valid) return res.status(auth.statusCode).json({ success: false, reason: auth.reason });
    const featureFlags = resolveFeatureFlags();
    if (!runFeatureGuard(featureFlags, "agencies", res, () => true)) return;
    const data = await platform.agencyService.subscribeAgency(auth.ownerId, req.params.agencyId, { actor: auth.ownerId });
    res.status(200).json({ success: true, data });
  }));

  router.get("/owner/offers", authenticateVendor, catchAsyncErrors(async (req, res) => {
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

  router.post("/owner/offers/:offerId/:status", authenticateVendor, catchAsyncErrors(async (req, res) => {
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
