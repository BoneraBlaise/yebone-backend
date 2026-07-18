/**
 * Delivery endpoint security helpers.
 */
class DeliverySecurity {
  static assertAuthenticatedUser(req) {
    if (!req.user?._id) {
      return { valid: false, reason: "UNAUTHENTICATED", statusCode: 401 };
    }
    return { valid: true, userId: String(req.user._id), role: req.user.role || "user" };
  }

  static assertAdmin(req) {
    const auth = DeliverySecurity.assertAuthenticatedUser(req);
    if (!auth.valid) return auth;

    if (!["admin", "super-admin"].includes(auth.role)) {
      return { valid: false, reason: "FORBIDDEN", statusCode: 403 };
    }

    return auth;
  }

  static assertCustomerAccess(req, delivery = {}) {
    const auth = DeliverySecurity.assertAuthenticatedUser(req);
    if (!auth.valid) return auth;

    if (["admin", "super-admin"].includes(auth.role)) {
      return auth;
    }

    if (String(delivery.customerId) !== auth.userId) {
      return { valid: false, reason: "FORBIDDEN", statusCode: 403 };
    }

    return auth;
  }

  static assertOperationalAccess(req) {
    const auth = DeliverySecurity.assertAuthenticatedUser(req);
    if (!auth.valid) return auth;

    if (!["admin", "super-admin", "courier", "vendor"].includes(auth.role)) {
      return { valid: false, reason: "FORBIDDEN", statusCode: 403 };
    }

    return auth;
  }
}

module.exports = DeliverySecurity;
