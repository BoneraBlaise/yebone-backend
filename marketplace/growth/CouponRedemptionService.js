const CoupounCode = require("../../model/coupounCode");

class CouponRedemptionService {
  constructor({ couponValidator, analytics } = {}) {
    if (!couponValidator) throw new Error("CouponRedemptionService requires couponValidator");
    this.couponValidator = couponValidator;
    this.analytics = analytics;
  }

  async validateAndRedeem({ code, cart = [], userId = null, session = null, orderId = null }) {
    if (!code) {
      return { valid: true, totalDiscount: 0, couponCode: null, couponId: null };
    }

    const redemptionKey = orderId ? String(orderId) : null;
    const validation = await this.couponValidator.validateForOrder({
      code,
      cart,
      userId,
      redemptionKey,
    });

    if (!validation.valid) {
      if (this.analytics) this.analytics.recordCouponFailure();
      return validation;
    }

    const couponId = validation.coupon?.id;
    if (!couponId) {
      if (this.analytics) this.analytics.recordCouponFailure();
      return { valid: false, reason: "COUPON_NOT_FOUND" };
    }

    const query = {
      _id: couponId,
      isActive: { $ne: false },
      $or: [{ usageLimit: null }, { $expr: { $lt: ["$usageCount", "$usageLimit"] } }],
    };

    if (redemptionKey) {
      query.lastRedemptionKey = { $ne: redemptionKey };
    }

    const update = {
      $inc: { usageCount: 1 },
      $set: { lastRedeemedAt: new Date() },
    };
    if (redemptionKey) update.$set.lastRedemptionKey = redemptionKey;
    if (userId) update.$set.lastRedeemedBy = String(userId);

    const updated = await CoupounCode.findOneAndUpdate(query, update, {
      new: true,
      session: session || undefined,
    });

    if (!updated) {
      if (this.analytics) this.analytics.recordCouponFailure();
      return { valid: false, reason: "COUPON_REDEMPTION_FAILED" };
    }

    if (this.analytics) this.analytics.recordCouponRedemption();

    return {
      valid: true,
      totalDiscount: validation.coupon.discountAmount,
      eligibleSubtotal: validation.coupon.eligibleSubtotal,
      couponCode: updated.name,
      couponId: String(updated._id),
      segments: validation.segments,
    };
  }
}

module.exports = CouponRedemptionService;
