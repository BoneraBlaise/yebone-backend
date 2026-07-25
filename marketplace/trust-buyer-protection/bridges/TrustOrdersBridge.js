class TrustOrdersBridge {
  constructor({ repository, orderPlatform = null } = {}) {
    this.repository = repository;
    this.orderPlatform = orderPlatform;
    this._seedOrders = new Map();
  }

  resetForTests() {
    this._seedOrders.clear();
  }

  seedOrder(order) {
    const id = String(order.orderId || order._id || order.id);
    const record = { ...order, orderId: id };
    this._seedOrders.set(id, record);
    if (this.repository?.seedOrder) this.repository.seedOrder(record);
    return record;
  }

  async getOrder(orderId) {
    const id = String(orderId);
    if (this.repository) {
      const fromRepo = await this.repository.getOrder(id);
      if (fromRepo) return fromRepo;
    }
    if (this._seedOrders.has(id)) return structuredClone(this._seedOrders.get(id));

    if (this.orderPlatform?.orderService?.getOrderById) {
      try {
        return await this.orderPlatform.orderService.getOrderById(id);
      } catch (_error) {
        return null;
      }
    }
    return null;
  }

  async assertOrderOwnership(orderId, { buyerId, sellerId } = {}) {
    const order = await this.getOrder(orderId);
    if (!order) {
      const error = new Error("Order not found");
      error.statusCode = 404;
      throw error;
    }
    const orderBuyer = String(order.userId || order.buyerId || order.user?._id || "");
    const orderSeller = String(
      order.shopId || order.sellerId || order.cart?.[0]?.shopId || order.vendorId || ""
    );
    if (buyerId && orderBuyer && orderBuyer !== String(buyerId)) {
      const error = new Error("Order ownership mismatch (buyer)");
      error.statusCode = 403;
      throw error;
    }
    if (sellerId && orderSeller && orderSeller !== String(sellerId)) {
      const error = new Error("Order ownership mismatch (seller)");
      error.statusCode = 403;
      throw error;
    }
    return order;
  }
}

module.exports = TrustOrdersBridge;
