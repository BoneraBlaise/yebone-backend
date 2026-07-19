const { getMarketplacePaymentFacade } = require("../../../payments/legacy/PaymentFacadeRegistry");

class OrderPaymentBridge {
  constructor({ audit, observability } = {}) {
    this.audit = audit;
    this.observability = observability;
  }

  _error(message, statusCode = 502) {
    const error = new Error(message);
    error.statusCode = statusCode;
    return error;
  }

  async prepareOrderPayments(orders = [], user = {}, { correlationId = null } = {}) {
    if (!Array.isArray(orders) || orders.length === 0) return [];

    const userId = String(user._id || user.id || user.userId || "");
    if (!userId) throw this._error("User id required for payment coordination", 400);

    const facade = getMarketplacePaymentFacade();
    const sessions = [];

    for (const order of orders) {
      const orderId = order._id?.toString?.() || order.id;
      const amount = Number(order.totalPrice);
      if (!orderId || !Number.isFinite(amount) || amount < 0) {
        throw this._error(`Invalid order payment payload for order ${orderId}`, 400);
      }

      const result = await facade.orderPayment({
        action: "create",
        orderId,
        userId,
        amount,
        currency: order.currency || "RWF",
        method: order.paymentInfo?.type || "CARD",
        idempotencyKey: `order-payment:${orderId}`,
        metadata: { source: "platform_integration", correlationId, orderType: order.orderType || "regular" },
      });

      if (!result?.coordinated) {
        if (this.observability) this.observability.increment("paymentFailures");
        throw this._error(result?.error || `Payment coordination failed for order ${orderId}`, 502);
      }

      if (this.observability) this.observability.increment("paymentSuccesses");
      if (this.audit) {
        await this.audit.record({
          platform: "payments",
          action: "order_payment.created",
          actor: userId,
          orderId,
          transactionId: result.workflowResult?.paymentId || null,
          correlationId,
          newValue: { amount, status: result.workflowResult?.status },
          reason: "order_create",
        });
      }

      sessions.push(
        Object.freeze({
          orderId,
          coordinated: true,
          paymentId: result.workflowResult?.paymentId,
          paymentReference: result.ledgerEntry?.referenceId || result.workflowResult?.paymentId || orderId,
          clientSecret: result.workflowResult?.clientSecret || null,
        })
      );
    }

    return sessions;
  }

  async captureAndSettle(order, { correlationId = null, vendorId = null } = {}) {
    const orderId = order._id?.toString?.() || order.id;
    const facade = getMarketplacePaymentFacade();
    const amount = Number(order.totalPrice);
    const shopId = vendorId || order.cart?.[0]?.shopId;

    const capture = await facade.orderPayment({
      action: "capture",
      orderId,
      paymentId: order.paymentInfo?.paymentId,
      amount,
      idempotencyKey: `capture:${orderId}`,
      settlement: {
        orderId,
        orderSubtotal: Number(order.subTotalPrice || amount),
        deliveryFee: Number(order.shipping || 0),
        vendorId: String(shopId),
      },
      metadata: { correlationId, source: "platform_integration" },
    });

    if (!capture?.coordinated) {
      throw this._error(capture?.error || `Payment capture failed for order ${orderId}`, 502);
    }

    const settlement = await facade.settlement({
      action: "settle",
      orderId,
      orderSubtotal: Number(order.subTotalPrice || amount),
      deliveryFee: Number(order.shipping || 0),
      vendorId: String(shopId),
      idempotencyKey: `settlement:${orderId}`,
    });

    if (this.audit) {
      await this.audit.record({
        platform: "payments",
        action: "order.settled",
        actor: "system",
        orderId,
        correlationId,
        newValue: settlement?.vendorBalance || settlement,
        reason: "order_delivered",
      });
    }

    if (this.observability) this.observability.increment("settlementEvents");
    return { capture, settlement };
  }

  async processRefund(order, { amount, reason = "refund", correlationId = null, actor = "system" } = {}) {
    const orderId = order._id?.toString?.() || order.id;
    const facade = getMarketplacePaymentFacade();
    const refundAmount = Number(amount ?? order.totalPrice);

    await facade.refund({
      action: "approve",
      orderId,
      paymentId: order.paymentInfo?.paymentId,
      amount: refundAmount,
      currentState: "REQUESTED",
      metadata: { correlationId },
    });

    const completed = await facade.refund({
      action: "complete",
      orderId,
      paymentId: order.paymentInfo?.paymentId,
      refundId: `refund_${orderId}_${Date.now()}`,
      amount: refundAmount,
      currency: order.currency || "RWF",
      reason,
      metadata: { correlationId, actor },
    });

    if (!completed?.coordinated) {
      throw this._error(completed?.error || `Refund failed for order ${orderId}`, 502);
    }

    if (this.audit) {
      await this.audit.record({
        platform: "payments",
        action: "order.refunded",
        actor,
        orderId,
        correlationId,
        newValue: { amount: refundAmount, reason },
      });
    }

    if (this.observability) this.observability.increment("refundEvents");
    return { completed };
  }
}

module.exports = OrderPaymentBridge;
