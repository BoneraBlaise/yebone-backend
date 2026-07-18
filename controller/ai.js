const express = require("express");
const catchAsyncErrors = require("../middleware/catchAsyncErrors");
const ErrorHandler = require("../utils/ErrorHandler");
const { getAIPlatform } = require("../marketplace/ai");
const { optionalAuth } = require("../marketplace/ai/middleware/optionalAuth");
const { chatRateLimiter, searchRateLimiter } = require("../marketplace/ai/middleware/aiRateLimit");

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
        meta: { latencyMs: result.latencyMs, requestId: result.data.requestId },
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
        meta: { latencyMs: result.latencyMs, requestId: result.data.requestId },
      });
    } catch (err) {
      err.statusCode = err.statusCode || 500;
      return next(err);
    }
  })
);

router.use((err, req, res, next) => {
  if (err.statusCode) {
    return res.status(err.statusCode).json({
      success: false,
      message: err.message,
      requestId: req.aiRequestId || null,
    });
  }
  return next(err);
});

module.exports = router;
