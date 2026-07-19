const { getMarketplacePaymentFacade } = require("../../payments/legacy/PaymentFacadeRegistry");

class PaymentIntegrationHook {
  constructor({ enabled = true } = {}) {
    this.enabled = enabled;
  }

  async prepareForOrders(orders = [], user = {}) {
    if (!this.enabled || !Array.isArray(orders) || orders.length === 0) {
      return [];
    }

    const userId = user._id || user.id || user.userId;
    if (!userId) {
      const error = new Error("Authenticated user required for payment coordination");
      error.statusCode = 401;
      throw error;
    }

    const facade = getMarketplacePaymentFacade();
    const sessions = [];

    for (const order of orders) {
      const orderId = order._id?.toString?.() || order.id;
      const amount = Number(order.totalPrice);
      const result = await facade.orderPayment({
        action: "create",
        orderId,
        userId: String(userId),
        amount,
        currency: order.currency || "RWF",
        method: order.paymentInfo?.type || "CARD",
        idempotencyKey: `order-payment:${orderId}`,
        metadata: { source: "marketplace_core", orderType: order.orderType || "regular" },
      });

      if (!result?.coordinated) {
        const error = new Error(result?.error || `Payment coordination failed for order ${orderId}`);
        error.statusCode = 502;
        throw error;
      }

      sessions.push(
        Object.freeze({
          orderId,
          coordinated: true,
          paymentReference: result.workflowResult?.paymentId || result.ledgerEntry?.referenceId || orderId,
          clientSecret: result.workflowResult?.clientSecret || null,
        })
      );
    }

    return sessions;
  }
}

module.exports = PaymentIntegrationHook;
