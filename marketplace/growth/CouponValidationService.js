const GrowthLegacyAdapter = require("./GrowthLegacyAdapter");
const CoupounCode = require("../../model/coupounCode");

class CouponValidationService {
  constructor({ legacy = new GrowthLegacyAdapter() } = {}) {
    this.legacy = legacy;
  }

  _resolveBrandId(item = {}) {
    return item.brand || item.brandId || item.tags || null;
  }

  _groupCartByShop(cart = []) {
    const groups = new Map();
    for (const item of cart) {
      const shopId = item.shopId || item.shop?._id || item.shop;
      if (!shopId) continue;
      if (!groups.has(String(shopId))) groups.set(String(shopId), []);
      groups.get(String(shopId)).push(item);
    }
    return groups;
  }

  _segmentSubtotal(items = []) {
    return items.reduce((sum, item) => {
      const price = Number(item.discountPrice || item.price || item.originalPrice || 0);
      const qty = Number(item.qty || 1);
      return sum + price * qty;
    }, 0);
  }

  async validate(input = {}) {
    if (Array.isArray(input.cart) && input.cart.length) {
      return this.validateForOrder(input);
    }

    return this._validateSingle({
      coupon: input.coupon || (await this.legacy.findCouponByName(input.code)),
      code: input.code,
      cartTotal: input.cartTotal,
      shopId: input.shopId,
      productId: input.productId,
      category: input.category,
      brandId: input.brandId,
    });
  }

  async validateForOrder(input = {}) {
    const { code, cart = [], userId = null, redemptionKey = null } = input;
    if (!code) return { valid: false, reason: "COUPON_CODE_REQUIRED" };

    const coupon = await this.legacy.findCouponByName(code);
    if (!coupon) return { valid: false, reason: "COUPON_NOT_FOUND" };

    const baseCheck = this._validateCouponState(coupon, { userId, redemptionKey });
    if (!baseCheck.valid) return baseCheck;

    const shopGroups = this._groupCartByShop(cart);
    if (!shopGroups.size) return { valid: false, reason: "EMPTY_CART" };

    let totalDiscount = 0;
    let eligibleSubtotal = 0;
    const segments = [];

    for (const [shopId, items] of shopGroups) {
      if (coupon.shopId && String(coupon.shopId) !== String(shopId)) continue;

      const cartTotal = this._segmentSubtotal(items);
      if (cartTotal <= 0) continue;

      const segmentResult = await this._validateSegment(coupon, {
        cartTotal,
        shopId,
        items,
      });

      if (!segmentResult.valid) return segmentResult;

      totalDiscount += segmentResult.discountAmount;
      eligibleSubtotal += cartTotal;
      segments.push({ shopId, cartTotal, discountAmount: segmentResult.discountAmount, items: items.length });
    }

    if (coupon.shopId && eligibleSubtotal <= 0) {
      return { valid: false, reason: "SHOP_NOT_IN_CART" };
    }

    if (eligibleSubtotal <= 0) {
      return { valid: false, reason: "NO_ELIGIBLE_ITEMS" };
    }

    return {
      valid: true,
      coupon: {
        id: String(coupon._id),
        code: coupon.name,
        discountAmount: totalDiscount,
        eligibleSubtotal,
        shopId: coupon.shopId,
      },
      couponDoc: coupon,
      segments,
    };
  }

  async _validateSingle({ coupon, code, cartTotal = 0, shopId, productId, category, brandId }) {
    if (!coupon && code) coupon = await this.legacy.findCouponByName(code);
    if (!coupon) return { valid: false, reason: "COUPON_NOT_FOUND" };

    const state = this._validateCouponState(coupon);
    if (!state.valid) return state;

    return this._validateSegment(coupon, {
      cartTotal,
      shopId,
      items: productId ? [{ _id: productId, category, brand: brandId, qty: 1, discountPrice: cartTotal }] : [],
      productId,
      category,
      brandId,
    });
  }

  _validateCouponState(coupon, { userId = null, redemptionKey = null } = {}) {
    if (coupon.isActive === false) return { valid: false, reason: "COUPON_INACTIVE" };
    if (coupon.expiresAt && new Date(coupon.expiresAt) < new Date()) {
      return { valid: false, reason: "COUPON_EXPIRED" };
    }
    if (coupon.usageLimit != null && coupon.usageCount >= coupon.usageLimit) {
      return { valid: false, reason: "COUPON_USAGE_LIMIT_REACHED" };
    }
    if (coupon.usageLimit === 1 && coupon.usageCount >= 1) {
      return { valid: false, reason: "COUPON_ALREADY_REDEEMED" };
    }
    if (redemptionKey && coupon.lastRedemptionKey === redemptionKey) {
      return { valid: false, reason: "DUPLICATE_REDEMPTION" };
    }
    return { valid: true, userId };
  }

  async _validateSegment(coupon, { cartTotal, shopId, items = [], productId, category, brandId }) {
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

    if (coupon.selectedProduct) {
      const eligibleItems = items.filter(
        (item) => String(item._id) === String(coupon.selectedProduct)
      );
      if (!eligibleItems.length && productId && String(coupon.selectedProduct) !== String(productId)) {
        return { valid: false, reason: "PRODUCT_NOT_ELIGIBLE" };
      }
      if (items.length && !eligibleItems.length) {
        return { valid: false, reason: "PRODUCT_NOT_ELIGIBLE" };
      }
    }

    if (coupon.category) {
      const categories = items.map((item) => item.category).filter(Boolean);
      if (categories.length && !categories.some((value) => String(value) === String(coupon.category))) {
        if (category && String(coupon.category) !== String(category)) {
          return { valid: false, reason: "CATEGORY_NOT_ELIGIBLE" };
        }
        if (!category) return { valid: false, reason: "CATEGORY_NOT_ELIGIBLE" };
      }
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
      discountAmount,
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
