class GrowthAdminAccess {
  static normalizeRole(role = "") {
    const normalized = String(role).trim();
    if (normalized === "Admin") return "admin";
    return normalized.toLowerCase();
  }

  static assertSuperAdmin(req) {
    if (!req.user?._id) {
      return { valid: false, reason: "UNAUTHENTICATED", statusCode: 401 };
    }
    const role = GrowthAdminAccess.normalizeRole(req.user.role);
    if (!["admin", "super-admin"].includes(role)) {
      return { valid: false, reason: "FORBIDDEN", statusCode: 403 };
    }
    return { valid: true, userId: String(req.user._id), role };
  }
}

module.exports = GrowthAdminAccess;
