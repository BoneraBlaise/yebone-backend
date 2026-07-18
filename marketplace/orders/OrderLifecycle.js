/**
 * Order lifecycle states and transitions.
 */
class OrderLifecycle {
  static STATES = Object.freeze({
    PROCESSING: "Processing",
    IN_TRANSIT: "in_transit",
    DELIVERED: "Delivered",
    REFUND: "refund",
    CANCELLED: "cancelled",
  });

  static FULFILLMENT_STATUSES = Object.freeze([
    "Processing",
    "Transferred to delivery partner",
    "Shipping",
    "Received",
    "On the way",
    "Delivered",
  ]);

  static REFUND_STATUSES = Object.freeze(["Processing refund", "Refund Success"]);

  resolvePhase(status = "") {
    if (OrderLifecycle.REFUND_STATUSES.includes(status)) {
      return OrderLifecycle.STATES.REFUND;
    }
    if (status === "Delivered") {
      return OrderLifecycle.STATES.DELIVERED;
    }
    if (status === "Processing") {
      return OrderLifecycle.STATES.PROCESSING;
    }
    if (OrderLifecycle.FULFILLMENT_STATUSES.includes(status)) {
      return OrderLifecycle.STATES.IN_TRANSIT;
    }
    return OrderLifecycle.STATES.PROCESSING;
  }

  afterCreate(orders = []) {
    return {
      count: Array.isArray(orders) ? orders.length : 0,
      phase: OrderLifecycle.STATES.PROCESSING,
    };
  }

  afterStatusUpdate(order = {}) {
    return {
      orderId: order._id?.toString?.() || order.id,
      status: order.status,
      phase: this.resolvePhase(order.status),
    };
  }
}

module.exports = OrderLifecycle;
