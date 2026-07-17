const MarketplacePermissions = require("../core/MarketplacePermissions");

/**
 * Vendor permission helpers — seller ownership and capability gates.
 */
class VendorPermissions {
  static ROLES = Object.freeze({
    SELLER: "Seller",
    ADMIN: "Admin",
  });

  static isSellerRequest(req = {}) {
    return MarketplacePermissions.isSellerRequest(req);
  }

  static assertSellerOwnership(requestSellerId, targetShopId) {
    if (!requestSellerId || !targetShopId) {
      return { valid: false, reason: "MISSING_ID" };
    }
    if (String(requestSellerId) !== String(targetShopId)) {
      return { valid: false, reason: "NOT_OWNER" };
    }
    return { valid: true };
  }

  static canAccessDashboard(seller = {}) {
    return Boolean(seller._id || seller.id);
  }

  static canUpdateProfile(seller = {}) {
    return VendorPermissions.canAccessDashboard(seller);
  }

  static canWithdraw(seller = {}, config = {}) {
    if (!VendorPermissions.canAccessDashboard(seller)) {
      return { allowed: false, reason: "NOT_AUTHENTICATED" };
    }

    if (config.requireVerificationForWithdraw && !seller.isVerified) {
      return { allowed: false, reason: "NOT_VERIFIED" };
    }

    if (!seller.withdrawMethod) {
      return { allowed: false, reason: "NO_WITHDRAW_METHOD" };
    }

    const balance = Number(seller.availableBalance || 0);
    const minAmount = Number(config.minWithdrawAmount || 50);
    if (balance < minAmount) {
      return { allowed: false, reason: "INSUFFICIENT_BALANCE" };
    }

    return { allowed: true };
  }
}

module.exports = VendorPermissions;
