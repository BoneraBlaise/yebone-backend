/**
 * Order endpoint security helpers.
 */
class OrderSecurity {
  static assertAuthenticatedUser(req) {
    if (!req.user?._id) {
      return { valid: false, reason: "UNAUTHENTICATED", statusCode: 401 };
    }
    return { valid: true, userId: String(req.user._id) };
  }

  static assertUserOwnership(req, targetUserId) {
    const auth = OrderSecurity.assertAuthenticatedUser(req);
    if (!auth.valid) return auth;

    if (String(auth.userId) !== String(targetUserId)) {
      return { valid: false, reason: "FORBIDDEN", statusCode: 403 };
    }

    return { valid: true, userId: auth.userId };
  }

  static assertOrderOwnership(order = {}, userId) {
    const ownerId = order.user?._id || order.user?.id;
    if (!ownerId || String(ownerId) !== String(userId)) {
      return { valid: false, reason: "NOT_OWNER", statusCode: 403 };
    }
    return { valid: true };
  }

  static sanitizeStatusInput(status) {
    if (typeof status !== "string") return null;
    const trimmed = status.trim();
    return trimmed.length ? trimmed : null;
  }

  static pickStatusBody(body = {}) {
    return {
      status: OrderSecurity.sanitizeStatusInput(body.status),
    };
  }
}

module.exports = OrderSecurity;
