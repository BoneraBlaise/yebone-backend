/**
 * Order lifecycle hook registry — extension point for future phases.
 */
class OrderLifecycleHook {
  afterCreate({ orders }) {
    return Object.freeze({
      orderCount: Array.isArray(orders) ? orders.length : 0,
      handled: true,
    });
  }
}

module.exports = OrderLifecycleHook;
