class SellerAnalyticsService {
  constructor({ repository, inventoryService, catalogBridge }) {
    this.repository = repository;
    this.inventoryService = inventoryService;
    this.catalogBridge = catalogBridge;
  }

  async getVendorDashboard(vendorId) {
    const inventory = await this.inventoryService.listInventory(vendorId);
    const movements = await this.repository.listStockMovements({ vendorId });
    const purchaseOrders = await this.repository.listPurchaseOrders(vendorId);
    const returns = await this.repository.listReturns(vendorId);

    const inventoryValue = inventory.reduce(
      (sum, item) => sum + Number(item.currentStock || 0) * Number(item.unitPrice || 0),
      0
    );

    const salesByProduct = {};
    for (const movement of movements) {
      if (movement.type !== "sale") continue;
      salesByProduct[movement.productId] =
        (salesByProduct[movement.productId] || 0) + Math.abs(Number(movement.quantity || 0));
    }

    const topSellingProducts = Object.entries(salesByProduct)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([productId, quantity]) => ({ productId, quantity }));

    const lowStock = inventory.filter((item) => item.stockStatus === "low");
    const outOfStock = inventory.filter((item) => item.stockStatus === "out_of_stock");
    const fastMoving = topSellingProducts.slice(0, 3);
    const slowMoving = inventory
      .filter((item) => !salesByProduct[item.productId])
      .slice(0, 5)
      .map((item) => ({ productId: item.productId, quantity: 0 }));

    const totalSold = Object.values(salesByProduct).reduce((sum, qty) => sum + qty, 0);
    const averageInventoryUnits =
      inventory.reduce((sum, item) => sum + Number(item.currentStock || 0), 0) /
      Math.max(inventory.length, 1);
    const stockTurnover = averageInventoryUnits > 0 ? totalSold / averageInventoryUnits : 0;

    return {
      inventoryValue,
      topSellingProducts,
      lowStock,
      outOfStock,
      fastMoving,
      slowMoving,
      purchaseHistory: purchaseOrders.slice(0, 10),
      stockTurnover: Number(stockTurnover.toFixed(2)),
      returnsCount: returns.length,
      alertsCount: (await this.repository.listAlerts(vendorId)).length,
    };
  }

  async getAdminDashboard() {
    const inventory = await this.repository.listAllInventory();
    const suppliers = await this.repository.listAllSuppliers();
    const purchaseOrders = await this.repository.listPurchaseOrders(null);
    const returns = await this.repository.listReturns(null);

    const healthy = inventory.length;
    const lowStockCount = inventory.filter(
      (item) => Number(item.lowStockThreshold || 0) >= 0
    ).length;

    return {
      inventoryHealth: {
        trackedProducts: healthy,
        lowStockConfigured: lowStockCount,
      },
      suppliersCount: suppliers.length,
      purchaseOrdersCount: purchaseOrders.length,
      returnsCount: returns.length,
      globalStockInsights: {
        totalTrackedSkus: inventory.length,
        openPurchaseOrders: purchaseOrders.filter((po) =>
          ["draft", "ordered", "partially_received"].includes(po.status)
        ).length,
        pendingReturns: returns.filter((item) =>
          ["requested", "approved"].includes(item.status)
        ).length,
      },
    };
  }
}

module.exports = SellerAnalyticsService;
