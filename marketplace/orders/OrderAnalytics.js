/**
 * Basic order analytics summary.
 */
class OrderAnalytics {
  constructor({ lifecycle, config }) {
    this.lifecycle = lifecycle;
    this.config = config;
  }

  getSummary(order = {}) {
    const itemCount = Array.isArray(order.cart)
      ? order.cart.reduce((sum, item) => sum + Number(item.qty || 0), 0)
      : 0;

    return {
      orderId: order._id?.toString?.() || order.id || null,
      phase: this.lifecycle.resolvePhase(order.status),
      status: order.status,
      itemCount,
      totalPrice: Number(order.totalPrice || 0),
      orderType: order.orderType || "regular",
      hasReferral: Boolean(order.referralCode),
      analyticsEnabled: this.config.enableAnalytics,
    };
  }

  summarizeCollection(orders = []) {
    const list = Array.isArray(orders) ? orders : [];
    return {
      total: list.length,
      processing: list.filter((o) => o.status === "Processing").length,
      delivered: list.filter((o) => o.status === "Delivered").length,
      refund: list.filter((o) =>
        OrderAnalytics._isRefundStatus(o.status)
      ).length,
    };
  }

  static _isRefundStatus(status) {
    return status === "Processing refund" || status === "Refund Success";
  }
}

module.exports = OrderAnalytics;
