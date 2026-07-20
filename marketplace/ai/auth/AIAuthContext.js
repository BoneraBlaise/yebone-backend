const PlatformAuthService = require("../../integration/auth/PlatformAuthService");

class AIAuthContext {
  static fromRequest(req = {}) {
    const aiContext = req.aiContext || {};
    const userId = aiContext.userId || req.user?._id?.toString() || null;
    const vendorId = aiContext.vendorId || req.seller?._id?.toString() || null;
    let role = "anonymous";

    if (vendorId) {
      role = PlatformAuthService.ROLES?.VENDOR || "vendor";
    } else if (userId) {
      role = PlatformAuthService.ROLES?.USER || "user";
    }

    if (req.user?.role === "Admin" || req.user?.role === "Super Admin") {
      role = PlatformAuthService.ROLES?.ADMIN || "admin";
    }

    return {
      userId,
      vendorId,
      role,
      anonymous: !userId && !vendorId,
    };
  }

  static toToolContext(req = {}, extra = {}) {
    const auth = AIAuthContext.fromRequest(req);
    return {
      ...auth,
      ...extra,
    };
  }
}

module.exports = AIAuthContext;
