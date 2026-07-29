const catchAsyncErrors = require("../../../middleware/catchAsyncErrors");
const { isPaidService } = require("../commerce/CreditPolicy");
const { failure } = require("../utils/YEBOAIResponse");
const { maskForVendor } = require("../utils/ProviderMasking");

function getAIPlatform(req) {
  return req.app?.locals?.aiPlatform || require("../index").getAIPlatform();
}

function requireAISubscription(options = {}) {
  const {
    serviceTypeResolver = (req) => req.body?.serviceType || req.body?.scope || "preview",
    previewTypeResolver = (req) => req.body?.ai_preview_type || req.body?.previewType || null,
    vendorIdResolver = (req) =>
      req.aiContext?.vendorId ||
      req.seller?._id?.toString() ||
      req.body?.vendorId ||
      null,
    forcePaid = false,
  } = options;

  return catchAsyncErrors(async (req, res, next) => {
    const serviceType = serviceTypeResolver(req);
    const previewType = previewTypeResolver(req);
    const vendorId = vendorIdResolver(req);
    const paid = forcePaid || isPaidService(serviceType, previewType);

    req.aiServiceContext = { serviceType, previewType, vendorId, paid };

    if (!paid) return next();

    if (!vendorId) {
      const err = failure({
        code: "VENDOR_REQUIRED",
        message: "A vendor account is required for this YEBO AI service.",
        statusCode: 403,
        requestId: req.aiRequestId || null,
      });
      return res.status(err.statusCode).json(err.publicPayload);
    }

    const platform = getAIPlatform(req);
    const entitlement = await platform.entitlements.assertEntitled(vendorId, {
      serviceType,
      previewType,
    });

    if (!entitlement.ok) {
      return res.status(entitlement.code === "INSUFFICIENT_CREDITS" ? 402 : 403).json(
        maskForVendor({
          success: false,
          code: entitlement.code,
          message: entitlement.message,
          displayBrand: "YEBO AI",
          wallet: entitlement.wallet,
          subscription: entitlement.subscription,
          requestId: req.aiRequestId || null,
        })
      );
    }

    req.aiEntitlement = entitlement;
    return next();
  });
}

module.exports = { requireAISubscription };
