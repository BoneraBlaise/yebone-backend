/**
 * Order lifecycle hooks — extension points for later phases.
 */
class OrderHooks {
  constructor({ lifecycle } = {}) {
    this.lifecycle = lifecycle;
    this.handlers = {
      onCreated: [],
      onStatusUpdated: [],
      onRefundRequested: [],
      onRefundAccepted: [],
    };
  }

  afterCreate(orders) {
    return this._emit("onCreated", this.lifecycle.afterCreate(orders));
  }

  afterStatusUpdated(order) {
    return this._emit("onStatusUpdated", this.lifecycle.afterStatusUpdate(order));
  }

  afterRefundRequested(order) {
    return this._emit("onRefundRequested", {
      orderId: order._id?.toString?.(),
      status: order.status,
    });
  }

  afterRefundAccepted(order) {
    return this._emit("onRefundAccepted", {
      orderId: order._id?.toString?.(),
      status: order.status,
    });
  }

  _emit(event, payload) {
    for (const handler of this.handlers[event] || []) {
      handler(payload);
    }
    return payload;
  }
}

module.exports = OrderHooks;
