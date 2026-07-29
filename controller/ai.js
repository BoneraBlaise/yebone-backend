const express = require("express");
const catchAsyncErrors = require("../middleware/catchAsyncErrors");
const { getAIPlatform } = require("../marketplace/ai");
const { optionalAuth } = require("../marketplace/ai/middleware/optionalAuth");
const { requireAISubscription } = require("../marketplace/ai/middleware/requireAISubscription");
const { chatRateLimiter, searchRateLimiter } = require("../marketplace/ai/middleware/aiRateLimit");
const { isSeller } = require("../middleware/auth");
const { AI_SERVICE } = require("../marketplace/ai/commerce/CreditPolicy");
const { maskForVendor, maskForCustomer } = require("../marketplace/ai/utils/ProviderMasking");

const router = express.Router();

router.post(
  "/chat",
  optionalAuth,
  chatRateLimiter,
  catchAsyncErrors(async (req, res, next) => {
    try {
      const platform = getAIPlatform();
      const result = await platform.gateway.handleChat(req);

      if (result.stream) {
        res.setHeader("X-Request-Id", result.requestId);
        return platform.gateway.writeSseStream(res, result.iterator);
      }

      return res.status(200).json({
        success: true,
        data: result.data,
        meta: { latencyMs: result.latencyMs, requestId: result.data.requestId, displayBrand: "YEBO AI" },
      });
    } catch (err) {
      err.statusCode = err.statusCode || 500;
      return next(err);
    }
  })
);

router.post(
  "/search",
  optionalAuth,
  searchRateLimiter,
  catchAsyncErrors(async (req, res, next) => {
    try {
      const platform = getAIPlatform();
      const result = await platform.gateway.handleSearch(req);
      return res.status(200).json({
        success: true,
        data: result.data,
        meta: { latencyMs: result.latencyMs, requestId: result.data.requestId, displayBrand: "YEBO AI" },
      });
    } catch (err) {
      err.statusCode = err.statusCode || 500;
      return next(err);
    }
  })
);

router.post(
  "/search/image",
  optionalAuth,
  searchRateLimiter,
  catchAsyncErrors(async (req, res, next) => {
    try {
      const platform = getAIPlatform();
      const result = await platform.gatewayServices.handleImageSearch(req);
      return res.status(200).json({
        success: true,
        data: result.data,
        meta: { latencyMs: result.latencyMs, displayBrand: "YEBO AI" },
      });
    } catch (err) {
      if (err.publicPayload) {
        return res.status(err.statusCode || 500).json(err.publicPayload);
      }
      err.statusCode = err.statusCode || 500;
      return next(err);
    }
  })
);

router.post(
  "/intelligence",
  optionalAuth,
  chatRateLimiter,
  catchAsyncErrors(async (req, res, next) => {
    try {
      const platform = getAIPlatform();
      const result = await platform.gatewayServices.handleIntelligence(req);
      return res.status(200).json({
        success: true,
        data: result.data,
        meta: { latencyMs: result.latencyMs, displayBrand: "YEBO AI" },
      });
    } catch (err) {
      if (err.publicPayload) {
        return res.status(err.statusCode || 500).json(err.publicPayload);
      }
      err.statusCode = err.statusCode || 500;
      return next(err);
    }
  })
);

router.post(
  "/preview",
  optionalAuth,
  requireAISubscription({
    serviceTypeResolver: () => AI_SERVICE.PREVIEW,
    previewTypeResolver: (req) => req.body?.ai_preview_type || req.body?.previewType,
    vendorIdResolver: (req) =>
      req.body?.vendorId ||
      req.aiContext?.vendorId ||
      req.seller?._id?.toString() ||
      null,
  }),
  catchAsyncErrors(async (req, res, next) => {
    try {
      const platform = getAIPlatform();
      const result = await platform.gatewayServices.handlePreview(req);
      return res.status(200).json({
        success: true,
        data: result.data,
        meta: { latencyMs: result.latencyMs, displayBrand: "YEBO AI" },
      });
    } catch (err) {
      if (err.publicPayload) {
        return res.status(err.statusCode || 500).json(err.publicPayload);
      }
      err.statusCode = err.statusCode || 500;
      return next(err);
    }
  })
);

router.get(
  "/preview/:sessionId/result",
  optionalAuth,
  catchAsyncErrors(async (req, res) => {
    const platform = getAIPlatform();
    const result = await platform.gatewayServices.getPreviewResult(req.params.sessionId);
    if (!result) {
      return res.status(404).json({
        success: false,
        message: "Preview session not found",
        displayBrand: "YEBO AI",
      });
    }
    return res.status(200).json({ success: true, data: result, meta: { displayBrand: "YEBO AI" } });
  })
);

router.post(
  "/preview/:sessionId/cancel",
  optionalAuth,
  catchAsyncErrors(async (req, res, next) => {
    try {
      const platform = getAIPlatform();
      const data = await platform.gatewayServices.cancelPreview(req.params.sessionId, {
        userId: req.aiContext?.userId || null,
      });
      return res.status(200).json({ success: true, data, meta: { displayBrand: "YEBO AI" } });
    } catch (err) {
      err.statusCode = err.statusCode || 500;
      return next(err);
    }
  })
);

router.get(
  "/customer/previews",
  optionalAuth,
  catchAsyncErrors(async (req, res) => {
    const customerId = req.aiContext?.userId;
    if (!customerId) {
      return res.status(401).json({
        success: false,
        message: "Authentication required for preview history",
        displayBrand: "YEBO AI",
      });
    }
    const platform = getAIPlatform();
    const sessions = await platform.previewSessions.listByCustomer(customerId);
    return res.status(200).json({
      success: true,
      data: maskForCustomer({
        sessions: sessions.map((session) => ({
          sessionId: session.sessionId,
          ai_preview_type: session.previewType,
          productId: session.productId,
          status: session.status,
          progress: session.progress,
        })),
      }),
      meta: { displayBrand: "YEBO AI" },
    });
  })
);

router.get(
  "/preview/:sessionId",
  optionalAuth,
  catchAsyncErrors(async (req, res) => {
    const platform = getAIPlatform();
    const session = await platform.gatewayServices.getPreviewSession(req.params.sessionId);
    if (!session) {
      return res.status(404).json({
        success: false,
        message: "Preview session not found",
        displayBrand: "YEBO AI",
      });
    }
    return res.status(200).json({ success: true, data: session, meta: { displayBrand: "YEBO AI" } });
  })
);

router.post(
  "/service",
  optionalAuth,
  isSeller,
  requireAISubscription({
    serviceTypeResolver: (req) => req.body?.serviceType || req.body?.service || AI_SERVICE.DESCRIPTION,
  }),
  catchAsyncErrors(async (req, res, next) => {
    try {
      const platform = getAIPlatform();
      const result = await platform.gatewayServices.handleService(req);
      return res.status(200).json({
        success: true,
        data: result.data,
        meta: { latencyMs: result.latencyMs, displayBrand: "YEBO AI" },
      });
    } catch (err) {
      if (err.publicPayload) {
        return res.status(err.statusCode || 500).json(err.publicPayload);
      }
      err.statusCode = err.statusCode || 500;
      return next(err);
    }
  })
);

router.get(
  "/vendor/dashboard",
  optionalAuth,
  isSeller,
  catchAsyncErrors(async (req, res) => {
    const platform = getAIPlatform();
    const data = await platform.gatewayServices.handleVendorDashboard(req);
    return res.status(200).json({ success: true, data, meta: { displayBrand: "YEBO AI" } });
  })
);

router.get(
  "/vendor/credits",
  optionalAuth,
  isSeller,
  catchAsyncErrors(async (req, res) => {
    const vendorId = req.seller?._id?.toString();
    const platform = getAIPlatform();
    await platform.entitlements.subscriptions.ensureSubscription(vendorId);
    const wallet = await platform.entitlements.credits.getWalletSnapshot(vendorId);
    return res.status(200).json({ success: true, data: wallet, meta: { displayBrand: "YEBO AI" } });
  })
);

router.get(
  "/vendor/subscription",
  optionalAuth,
  isSeller,
  catchAsyncErrors(async (req, res) => {
    const vendorId = req.seller?._id?.toString();
    const platform = getAIPlatform();
    const sub = await platform.entitlements.subscriptions.ensureSubscription(vendorId);
    return res.status(200).json({
      success: true,
      data: platform.entitlements.subscriptions.toPublicDTO(sub),
      meta: { displayBrand: "YEBO AI" },
    });
  })
);

router.use((err, req, res, next) => {
  if (err.statusCode) {
    return res.status(err.statusCode).json(
      maskForVendor({
        success: false,
        message: err.message,
        reason: err.reason || err.code || null,
        requestId: req.aiRequestId || null,
        displayBrand: "YEBO AI",
      })
    );
  }
  return next(err);
});

module.exports = router;
