const PlatformAuthService = require("../integration/auth/PlatformAuthService");

class TrustBuyerProtectionAccess {
  static assertSuperAdmin(req) {
    return PlatformAuthService.assertSuperAdmin(req);
  }

  static assertAuthenticated(req) {
    if (!req.user?._id && !req.seller?._id) {
      return { valid: false, reason: "UNAUTHENTICATED", statusCode: 401 };
    }
    return {
      valid: true,
      userId: String(req.user?._id || req.seller?._id),
      role: req.seller?._id ? "vendor" : "customer",
    };
  }

  static assertBuyer(req) {
    if (!req.user?._id) {
      return { valid: false, reason: "UNAUTHENTICATED", statusCode: 401 };
    }
    return { valid: true, buyerId: String(req.user._id), role: "buyer" };
  }

  static assertSeller(req) {
    if (!req.seller?._id) {
      return { valid: false, reason: "UNAUTHENTICATED", statusCode: 401 };
    }
    return { valid: true, sellerId: String(req.seller._id), role: "seller" };
  }

  static assertFeatureEnabled(featureFlags, key) {
    if (!featureFlags?.isEnabledSync("trustBuyerProtection", `${key}.enabled`)) {
      const error = new Error(`Trust & Buyer Protection feature disabled: ${key}`);
      error.statusCode = 403;
      error.reason = "FEATURE_DISABLED";
      error.feature = key;
      throw error;
    }
  }
}

module.exports = TrustBuyerProtectionAccess;
