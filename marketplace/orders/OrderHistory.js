/**
 * Order history read operations.
 */
class OrderHistory {
  constructor({ orderService }) {
    this.orderService = orderService;
  }

  listForUser(userId) {
    return this.orderService.getOrdersByUserId(userId);
  }

  listForShop(shopId) {
    return this.orderService.getOrdersByShopId(shopId);
  }

  listForAdmin() {
    return this.orderService.getAllOrdersAdmin();
  }

  getById(orderId) {
    return this.orderService.findById(orderId);
  }
}

module.exports = OrderHistory;
