const PlatformAuthService = require("../../integration/auth/PlatformAuthService");

class DeliveryAdminAccess {
  static normalizeRole(role = "") {
    return PlatformAuthService.normalizeRole(role);
  }

  static assertSuperAdmin(req) {
    return PlatformAuthService.assertSuperAdmin(req);
  }
}

module.exports = DeliveryAdminAccess;
