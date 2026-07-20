const PlatformAuthService = require("../integration/auth/PlatformAuthService");

class PropertyMobilityAccess {
  static assertSuperAdmin(req) {
    return PlatformAuthService.assertSuperAdmin(req);
  }

  static assertOwner(req) {
    if (!req.user?._id && !req.seller?._id) {
      return { valid: false, reason: "UNAUTHENTICATED", statusCode: 401 };
    }
    const ownerId = String(req.seller?._id || req.user._id);
    return { valid: true, ownerId, role: req.seller ? "vendor" : "user" };
  }

  static assertUser(req) {
    if (!req.user?._id) {
      return { valid: false, reason: "UNAUTHENTICATED", statusCode: 401 };
    }
    return { valid: true, userId: String(req.user._id) };
  }

  static assertFeatureEnabled(featureFlags, key) {
    if (!featureFlags?.isEnabledSync("propertyMobility", `${key}.enabled`)) {
      const error = new Error(`Property Mobility feature disabled: ${key}`);
      error.statusCode = 403;
      error.reason = "FEATURE_DISABLED";
      error.feature = key;
      throw error;
    }
  }
}

module.exports = PropertyMobilityAccess;
