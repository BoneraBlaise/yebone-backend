class SellerOperationsOrdersBridge {
  constructor({ useMemoryOnly = false } = {}) {
    this.useMemoryOnly = useMemoryOnly;
  }

  _getOrderPlatform() {
    try {
      const { getOrderPlatform } = require("../index");
      return getOrderPlatform();
    } catch (_error) {
      return null;
    }
  }

  async requestRefund(orderId, actorId) {
    if (this.useMemoryOnly) {
      return { orderId, status: "Processing refund", delegated: true };
    }

    const platform = this._getOrderPlatform();
    if (!platform) return null;
    return platform.requestRefund(orderId, "Processing refund", actorId);
  }
}

module.exports = SellerOperationsOrdersBridge;
