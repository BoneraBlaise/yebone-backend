const PlatformAuthService = require("../integration/auth/PlatformAuthService");
const { assertVendorResolved } = require("../../middleware/vendorAuth");

class PropertyMobilityAccess {
  static assertSuperAdmin(req) {
    return PlatformAuthService.assertSuperAdmin(req);
  }

  /** Unified vendor ownership — always Shop._id via req.vendorId */
  static assertVendor(req) {
    return assertVendorResolved(req);
  }

  /** @deprecated Use assertVendor */
  static assertOwner(req) {
    return PropertyMobilityAccess.assertVendor(req);
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
