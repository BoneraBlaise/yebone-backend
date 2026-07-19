const CoupounCode = require("../../../model/coupounCode");

/**
 * Atomic refund lifecycle — payment, growth, coupon reversal.
 */
class RefundLifecycleBridge {
  constructor({ paymentBridge, audit, observability, orderService } = {}) {
    this.paymentBridge = paymentBridge;
    this.audit = audit;
    this.observability = observability;
    this.orderService = orderService;
  }

  async executeRefund(order, { sellerId = null, actor = "system", correlationId = null, session = null } = {}) {
    const orderId = order._id?.toString?.() || order.id;

    if (this.paymentBridge) {
      await this.paymentBridge.processRefund(order, {
        correlationId,
        actor,
        reason: "order_refund_success",
      });
    }

    if (order.referralCode) {
      const { getGrowthPlatform } = require("../../growth");
      await getGrowthPlatform().cancelOrderCommission(orderId, order.referralCode, "refunded");
    }

    if (order.couponCode) {
      await this._restoreCouponUsage(order.couponCode, orderId, session);
    }

    await this.orderService.inventory.restoreCartItems(order.cart || [], session);

    if (this.audit) {
      await this.audit.record({
        platform: "orders",
        action: "refund.lifecycle_completed",
        actor,
        orderId,
        correlationId,
        newValue: {
          referralCode: order.referralCode || null,
          couponCode: order.couponCode || null,
        },
        reason: "refund_success",
      });
    }

    if (this.observability) this.observability.increment("refundEvents");

    return { orderId, reversed: true };
  }

  async _restoreCouponUsage(couponCode, orderId, session = null) {
    const query = { name: String(couponCode).trim() };
    const update = {
      $inc: { usageCount: -1 },
      $unset: { lastRedemptionKey: "", lastRedeemedAt: "", lastRedeemedBy: "" },
    };

    let op = CoupounCode.findOneAndUpdate(query, update, { new: true });
    if (session) op = op.session(session);
    await op;

    if (this.audit) {
      await this.audit.record({
        platform: "growth",
        action: "coupon.usage_restored",
        actor: "system",
        orderId,
        newValue: { couponCode },
        reason: "refund_reversal",
      });
    }
  }
}

module.exports = RefundLifecycleBridge;
