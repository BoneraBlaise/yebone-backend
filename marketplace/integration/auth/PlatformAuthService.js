/**
 * Unified RBAC — single role normalization for all platforms.
 */
class PlatformAuthService {
  static ROLES = Object.freeze({
    CUSTOMER: "user",
    VENDOR: "vendor",
    COURIER: "courier",
    ADMIN: "admin",
    SUPER_ADMIN: "super-admin",
  });

  static normalizeRole(role = "") {
    const normalized = String(role).trim();
    if (normalized === "Admin") return PlatformAuthService.ROLES.ADMIN;
    return normalized.toLowerCase();
  }

  static isAuthenticated(req) {
    return Boolean(req.user?._id || req.seller?._id);
  }

  static getActor(req) {
    if (req.user?._id) {
      return {
        id: String(req.user._id),
        role: PlatformAuthService.normalizeRole(req.user.role),
        type: "user",
      };
    }
    if (req.seller?._id) {
      return {
        id: String(req.seller._id),
        role: PlatformAuthService.ROLES.VENDOR,
        type: "seller",
      };
    }
    return { id: "anonymous", role: "anonymous", type: "anonymous" };
  }

  static isSuperAdmin(roleOrReq) {
    const role =
      typeof roleOrReq === "object"
        ? PlatformAuthService.normalizeRole(roleOrReq.user?.role)
        : PlatformAuthService.normalizeRole(roleOrReq);
    return [PlatformAuthService.ROLES.ADMIN, PlatformAuthService.ROLES.SUPER_ADMIN].includes(role);
  }

  static isAdmin(roleOrReq) {
    return PlatformAuthService.isSuperAdmin(roleOrReq);
  }

  static isVendor(req) {
    return Boolean(req.seller?._id);
  }

  static isCourier(req) {
    return PlatformAuthService.normalizeRole(req.user?.role) === PlatformAuthService.ROLES.COURIER;
  }

  static assertAuthenticatedUser(req) {
    if (!req.user?._id) {
      return { valid: false, reason: "UNAUTHENTICATED", statusCode: 401 };
    }
    return {
      valid: true,
      userId: String(req.user._id),
      role: PlatformAuthService.normalizeRole(req.user.role),
    };
  }

  static assertSuperAdmin(req) {
    if (!req.user?._id) {
      return { valid: false, reason: "UNAUTHENTICATED", statusCode: 401 };
    }
    if (!PlatformAuthService.isSuperAdmin(req)) {
      return { valid: false, reason: "FORBIDDEN", statusCode: 403 };
    }
    return {
      valid: true,
      userId: String(req.user._id),
      role: PlatformAuthService.normalizeRole(req.user.role),
    };
  }

  static assertOperationalAccess(req, allowedRoles = []) {
    const auth = PlatformAuthService.assertAuthenticatedUser(req);
    if (!auth.valid) return auth;

    const normalizedAllowed = allowedRoles.map((r) => PlatformAuthService.normalizeRole(r));
    if (!normalizedAllowed.includes(auth.role)) {
      return { valid: false, reason: "FORBIDDEN", statusCode: 403 };
    }
    return auth;
  }

  static assertSellerOwnership(req, shopId) {
    if (!req.seller?._id) {
      return { valid: false, reason: "UNAUTHENTICATED", statusCode: 401 };
    }
    if (String(req.seller._id) !== String(shopId)) {
      return { valid: false, reason: "FORBIDDEN", statusCode: 403 };
    }
    return { valid: true, sellerId: String(req.seller._id) };
  }
}

module.exports = PlatformAuthService;
