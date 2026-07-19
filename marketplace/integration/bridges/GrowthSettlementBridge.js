class GrowthSettlementBridge {
  constructor({ paymentBridge, audit, observability } = {}) {
    this.paymentBridge = paymentBridge;
    this.audit = audit;
    this.observability = observability;
  }

  async settleOrder(order, { correlationId = null } = {}) {
    const orderId = order._id?.toString?.() || order.id;
    const shopId = order.cart?.[0]?.shopId;
    let paymentResult = null;
    let growthResult = null;

    if (this.paymentBridge) {
      paymentResult = await this.paymentBridge.captureAndSettle(order, {
        correlationId,
        vendorId: shopId,
      });
    }

    if (order.referralCode) {
      const { getGrowthPlatform } = require("../../growth");
      growthResult = await getGrowthPlatform().settleOrderCommission(orderId, order.referralCode);

      if (growthResult && this.audit) {
        await this.audit.record({
          platform: "growth",
          action: "commission.settled",
          actor: "system",
          orderId,
          correlationId,
          newValue: {
            referralCode: order.referralCode,
            walletReference: paymentResult?.settlement?.walletSnapshot?.walletId || null,
          },
          reason: "unified_settlement",
        });
      }
    }

    if (this.observability) this.observability.increment("settlementEvents");
    return { paymentResult, growthResult };
  }
}

module.exports = GrowthSettlementBridge;
