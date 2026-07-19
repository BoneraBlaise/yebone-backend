const GrowthLegacyAdapter = require("./GrowthLegacyAdapter");

class CouponValidationService {
  constructor({ legacy = new GrowthLegacyAdapter() } = {}) {
    this.legacy = legacy;
  }

  async validate(input = {}) {
    const {
      code,
      cartTotal = 0,
      shopId = null,
      productId = null,
      category = null,
    } = input;

    if (!code) {
      return { valid: false, reason: "COUPON_CODE_REQUIRED" };
    }

    const coupon = await this.legacy.findCouponByName(code);
    if (!coupon) {
      return { valid: false, reason: "COUPON_NOT_FOUND" };
    }

    if (coupon.isActive === false) {
      return { valid: false, reason: "COUPON_INACTIVE" };
    }

    if (coupon.expiresAt && new Date(coupon.expiresAt) < new Date()) {
      return { valid: false, reason: "COUPON_EXPIRED" };
    }

    if (coupon.usageLimit != null && coupon.usageCount >= coupon.usageLimit) {
      return { valid: false, reason: "COUPON_USAGE_LIMIT_REACHED" };
    }

    const total = Number(cartTotal);
    if (coupon.minAmount != null && total < Number(coupon.minAmount)) {
      return { valid: false, reason: "MIN_AMOUNT_NOT_MET", minAmount: coupon.minAmount };
    }

    if (coupon.maxAmount != null && total > Number(coupon.maxAmount)) {
      return { valid: false, reason: "MAX_AMOUNT_EXCEEDED", maxAmount: coupon.maxAmount };
    }

    if (coupon.shopId && shopId && String(coupon.shopId) !== String(shopId)) {
      return { valid: false, reason: "SHOP_NOT_ELIGIBLE" };
    }

    if (coupon.selectedProduct && productId && String(coupon.selectedProduct) !== String(productId)) {
      return { valid: false, reason: "PRODUCT_NOT_ELIGIBLE" };
    }

    if (coupon.category && category && String(coupon.category) !== String(category)) {
      return { valid: false, reason: "CATEGORY_NOT_ELIGIBLE" };
    }

    let discountAmount = Number(coupon.value);
    if (coupon.discountType === "PERCENTAGE") {
      discountAmount = (total * Number(coupon.value)) / 100;
    }
    if (coupon.maxDiscount != null) {
      discountAmount = Math.min(discountAmount, Number(coupon.maxDiscount));
    }
    discountAmount = Math.max(0, Math.min(discountAmount, total));

    return {
      valid: true,
      coupon: {
        id: String(coupon._id),
        code: coupon.name,
        discountAmount,
        shopId: coupon.shopId,
      },
    };
  }
}

module.exports = CouponValidationService;
