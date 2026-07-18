/**
 * Order validation helpers.
 */
class OrderValidation {
  static validateCreateInput(input = {}) {
    const missing = [];
    if (!input.shippingAddress) missing.push("shippingAddress");
    if (!input.user) missing.push("user");
    if (!input.paymentInfo) missing.push("paymentInfo");

    if (!input.wonBid && (!Array.isArray(input.cart) || input.cart.length === 0)) {
      missing.push("cart");
    }

    if (missing.length) {
      return { valid: false, reason: "MISSING_FIELDS", fields: missing };
    }

    return { valid: true };
  }

  static assertSellerOwnership(order = {}, sellerId) {
    if (!sellerId) {
      return { valid: false, reason: "MISSING_SELLER" };
    }

    const ownsOrder = order.cart?.some(
      (item) => String(item.shopId) === String(sellerId)
    );

    if (!ownsOrder) {
      return { valid: false, reason: "NOT_OWNER" };
    }

    return { valid: true };
  }

  static canRequestRefund(order = {}) {
    if (order.status === "Delivered") {
      return { allowed: true };
    }
    if (order.status === "Processing") {
      return { allowed: true, asCancel: true };
    }
    return { allowed: false, reason: "INVALID_STATUS" };
  }

  static sanitizeCreateInput(input = {}) {
    return {
      cart: input.cart,
      wonBid: input.wonBid,
      shippingAddress: input.shippingAddress,
      user: input.user,
      paymentInfo: input.paymentInfo,
      shipping: input.shipping,
      subTotalPrice: input.subTotalPrice,
      totalPrice: input.totalPrice,
      referralCode: input.referralCode,
    };
  }
}

module.exports = OrderValidation;
