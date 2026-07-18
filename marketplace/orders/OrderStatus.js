const OrderLifecycle = require("./OrderLifecycle");
const OrderStateMachine = require("./OrderStateMachine");

/**
 * Order status helpers and messaging metadata.
 */
class OrderStatus {
  constructor({ lifecycle, stateMachine } = {}) {
    this.lifecycle = lifecycle || new OrderLifecycle();
    this.stateMachine = stateMachine || new OrderStateMachine();
  }

  getFulfillmentOptions(currentStatus) {
    const options = this.stateMachine.getFulfillmentOptions(currentStatus);
    if (options.length) {
      return options;
    }

    const index = OrderLifecycle.FULFILLMENT_STATUSES.indexOf(currentStatus);
    if (index === -1) {
      return [...OrderLifecycle.FULFILLMENT_STATUSES];
    }
    return OrderLifecycle.FULFILLMENT_STATUSES.slice(index);
  }

  getRefundOptions(currentStatus) {
    const options = this.stateMachine.getRefundOptions(currentStatus);
    if (options.length) {
      return options;
    }

    const index = OrderLifecycle.REFUND_STATUSES.indexOf(currentStatus);
    if (index === -1) {
      return [...OrderLifecycle.REFUND_STATUSES];
    }
    return OrderLifecycle.REFUND_STATUSES.slice(index);
  }

  getSummary(order = {}) {
    return {
      status: order.status,
      phase: this.lifecycle.resolvePhase(order.status),
      paymentStatus: order.paymentInfo?.status || "Pending",
      deliveredAt: order.deliveredAt || null,
    };
  }
}

module.exports = OrderStatus;
