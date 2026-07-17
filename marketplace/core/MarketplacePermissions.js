/**
 * Marketplace permission helpers — wraps existing auth middleware roles.
 */
class MarketplacePermissions {
  static ROLES = Object.freeze({
    CUSTOMER: "user",
    ADMIN: "Admin",
  });

  static isCustomer(user = {}) {
    return String(user.role || "").toLowerCase() === MarketplacePermissions.ROLES.CUSTOMER;
  }

  static isAdmin(user = {}) {
    return user.role === MarketplacePermissions.ROLES.ADMIN;
  }

  static isSellerRequest(req = {}) {
    return Boolean(req.seller || req.user?.isSeller);
  }

  static assertBuyerSellerSeparation({ buyerId, sellerId }) {
    if (!buyerId || !sellerId) {
      return { valid: false, reason: "MISSING_PARTY" };
    }
    if (String(buyerId) === String(sellerId)) {
      return { valid: false, reason: "BUYER_SELLER_SAME" };
    }
    return { valid: true };
  }
}

module.exports = MarketplacePermissions;
