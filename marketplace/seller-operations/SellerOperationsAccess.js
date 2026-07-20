const PlatformAuthService = require("../integration/auth/PlatformAuthService");

class SellerOperationsAccess {
  static assertSuperAdmin(req) {
    return PlatformAuthService.assertSuperAdmin(req);
  }

  static assertVendor(req) {
    if (!req.seller?._id) {
      return { valid: false, reason: "UNAUTHENTICATED", statusCode: 401 };
    }
    return { valid: true, vendorId: String(req.seller._id), role: PlatformAuthService.ROLES.VENDOR };
  }

  static assertFeatureEnabled(featureFlags, key) {
    if (!featureFlags?.isEnabledSync("sellerOperations", `${key}.enabled`)) {
      const error = new Error(`Seller Operations feature disabled: ${key}`);
      error.statusCode = 403;
      error.reason = "FEATURE_DISABLED";
      error.feature = key;
      throw error;
    }
  }
}

module.exports = SellerOperationsAccess;
