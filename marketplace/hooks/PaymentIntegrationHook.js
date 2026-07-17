const { delegateToFacade } = require("../../payments/legacy/adapters/LegacyFacadeDelegate");

/**
 * Payment integration hook — marketplace depends on payment; payment does not depend on marketplace.
 * Uses public legacy facade delegate only (payment-foundation-v10 frozen).
 */
class PaymentIntegrationHook {
  constructor({ enabled = true } = {}) {
    this.enabled = enabled;
  }

  async prepareForOrders(orders = [], user = {}) {
    if (!this.enabled || !Array.isArray(orders) || orders.length === 0) {
      return [];
    }

    const userId = user._id || user.id || user.userId || "marketplace-user";
    const sessions = [];

    for (const order of orders) {
      const orderId = order._id?.toString?.() || order.id;
      const delegation = await delegateToFacade("orderPayment", {
        action: "create",
        orderId,
        userId: String(userId),
        amount: Number(order.totalPrice),
        currency: order.currency || "RWF",
        method: order.paymentInfo?.type || "CARD",
        metadata: {
          source: "marketplace_core",
          orderType: order.orderType || "regular",
        },
      });

      sessions.push(
        Object.freeze({
          orderId,
          coordinated: delegation.coordinated === true,
          paymentReference:
            delegation.result?.result?.workflowResult?.paymentId ||
            delegation.result?.result?.ledgerEntry?.referenceId ||
            orderId,
          reason: delegation.reason || delegation.error || null,
        })
      );
    }

    return sessions;
  }
}

module.exports = PaymentIntegrationHook;
