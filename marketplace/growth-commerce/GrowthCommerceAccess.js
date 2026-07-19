const PlatformAuthService = require("../integration/auth/PlatformAuthService");

class GrowthCommerceAccess {
  static assertSuperAdmin(req) {
    return PlatformAuthService.assertSuperAdmin(req);
  }

  static assertVendor(req) {
    if (!req.seller?._id) {
      return { valid: false, reason: "UNAUTHENTICATED", statusCode: 401 };
    }
    return { valid: true, vendorId: String(req.seller._id), role: PlatformAuthService.ROLES.VENDOR };
  }

  static assertUser(req) {
    if (!req.user?._id) {
      return { valid: false, reason: "UNAUTHENTICATED", statusCode: 401 };
    }
    return {
      valid: true,
      userId: String(req.user._id),
      role: PlatformAuthService.normalizeRole(req.user.role),
    };
  }

  static assertFeatureEnabled(featureFlags, key) {
    if (!featureFlags?.isEnabledSync("growthCommerce", `${key}.enabled`)) {
      const error = new Error(`Growth Commerce feature disabled: ${key}`);
      error.statusCode = 403;
      error.reason = "FEATURE_DISABLED";
      error.feature = key;
      throw error;
    }
  }
}

module.exports = GrowthCommerceAccess;
