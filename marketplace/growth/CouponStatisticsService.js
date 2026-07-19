const CoupounCode = require("../../model/coupounCode");

class CouponStatisticsService {
  async getStatistics() {
    const coupons = await CoupounCode.find().lean();
    const now = new Date();

    const active = coupons.filter((c) => c.isActive !== false && (!c.expiresAt || new Date(c.expiresAt) >= now));
    const expired = coupons.filter((c) => c.expiresAt && new Date(c.expiresAt) < now);
    const disabled = coupons.filter((c) => c.isActive === false);

    const ranked = [...coupons].sort((a, b) => (b.usageCount || 0) - (a.usageCount || 0));

    return {
      summary: {
        total: coupons.length,
        active: active.length,
        expired: expired.length,
        disabled: disabled.length,
        totalRedemptions: coupons.reduce((sum, c) => sum + (c.usageCount || 0), 0),
      },
      mostUsed: ranked.slice(0, 10).map(this._mapCoupon),
      leastUsed: [...ranked].reverse().slice(0, 10).map(this._mapCoupon),
      activeCoupons: active.slice(0, 50).map(this._mapCoupon),
      expiredCoupons: expired.slice(0, 50).map(this._mapCoupon),
      disabledCoupons: disabled.slice(0, 50).map(this._mapCoupon),
    };
  }

  async getUsage(limit = 100) {
    const coupons = await CoupounCode.find()
      .sort({ usageCount: -1, updatedAt: -1 })
      .limit(limit)
      .lean();

    return coupons.map((coupon) => ({
      id: String(coupon._id),
      code: coupon.name,
      usageCount: coupon.usageCount || 0,
      usageLimit: coupon.usageLimit,
      shopId: coupon.shopId,
      isActive: coupon.isActive !== false,
      expiresAt: coupon.expiresAt,
      lastRedeemedAt: coupon.lastRedeemedAt || null,
    }));
  }

  _mapCoupon(coupon) {
    return {
      id: String(coupon._id),
      code: coupon.name,
      shopId: coupon.shopId,
      value: coupon.value,
      discountType: coupon.discountType || "FIXED",
      usageCount: coupon.usageCount || 0,
      usageLimit: coupon.usageLimit,
      isActive: coupon.isActive !== false,
      expiresAt: coupon.expiresAt || null,
      minAmount: coupon.minAmount,
      maxDiscount: coupon.maxDiscount,
    };
  }
}

module.exports = CouponStatisticsService;
