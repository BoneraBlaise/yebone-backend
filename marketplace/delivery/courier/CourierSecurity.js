const PlatformAuthService = require("../../integration/auth/PlatformAuthService");

/**
 * Courier endpoint security helpers — delegates to PlatformAuthService.
 */
class CourierSecurity {
  static assertAuthenticatedUser(req) {
    return PlatformAuthService.assertAuthenticatedUser(req);
  }

  static assertAdmin(req) {
    return PlatformAuthService.assertSuperAdmin(req);
  }

  static assertOperationalAccess(req) {
    return PlatformAuthService.assertOperationalAccess(req, [
      PlatformAuthService.ROLES.ADMIN,
      PlatformAuthService.ROLES.SUPER_ADMIN,
      PlatformAuthService.ROLES.COURIER,
      PlatformAuthService.ROLES.VENDOR,
    ]);
  }
}

module.exports = CourierSecurity;
