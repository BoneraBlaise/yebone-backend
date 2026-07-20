class SellerOperationsHealth {
  static check(platform) {
    return Object.freeze({
      status: "ok",
      module: "seller-operations",
      initialized: Boolean(platform?.initialized),
      useMemoryOnly: Boolean(platform?.useMemoryOnly),
      services: {
        inventory: Boolean(platform?.inventoryService),
        suppliers: Boolean(platform?.supplierService),
        purchaseOrders: Boolean(platform?.purchaseOrderService),
        stockMovements: Boolean(platform?.stockMovementService),
        returns: Boolean(platform?.returnService),
        bulkOperations: Boolean(platform?.bulkOperationsService),
        analytics: Boolean(platform?.analyticsService),
      },
    });
  }
}

module.exports = SellerOperationsHealth;
