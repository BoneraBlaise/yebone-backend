/**
 * Basic vendor analytics — derived from Shop model fields.
 */
class VendorAnalytics {
  constructor({ lifecycle, config }) {
    this.lifecycle = lifecycle;
    this.config = config;
  }

  getBasicSummary(shop = {}) {
    const transactions = Array.isArray(shop.transections) ? shop.transections : [];
    const completed = transactions.filter((entry) => entry.status === "Succeeded");
    const processing = transactions.filter((entry) => entry.status === "Processing");

    return {
      shopId: shop._id?.toString?.() || shop.id || null,
      lifecycleState: this.lifecycle.resolveState(shop),
      isVerified: Boolean(shop.isVerified),
      availableBalance: Number(shop.availableBalance || 0),
      transactionCount: transactions.length,
      completedWithdrawals: completed.length,
      pendingWithdrawals: processing.length,
      hasWithdrawMethod: Boolean(shop.withdrawMethod),
      createdAt: shop.createdAt || null,
      analyticsEnabled: this.config.enableAnalytics,
    };
  }
}

module.exports = VendorAnalytics;
