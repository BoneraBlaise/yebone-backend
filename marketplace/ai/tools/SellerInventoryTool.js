const BaseTool = require("./BaseTool");

class SellerInventoryTool extends BaseTool {
  constructor({ inventoryService } = {}) {
    super({
      id: "seller.inventory.read",
      name: "SellerInventoryTool",
      version: "13.0.0",
      capabilities: ["seller_inventory_snapshot", "inventory_health"],
      permissions: ["vendor"],
      platform: "SellerOperationsPlatform",
    });
    this.inventoryService = inventoryService;
  }

  async execute(input = {}, context = {}) {
    const vendorId = context.vendorId;
    if (!vendorId) {
      const error = new Error("Vendor context required");
      error.statusCode = 403;
      error.code = "PERMISSION_DENIED";
      throw error;
    }

    if (input.productId) {
      const item = await this.inventoryService.getInventory(vendorId, String(input.productId));
      return { inventory: item ? [item] : [], meta: { vendorId, count: item ? 1 : 0 } };
    }

    const inventory = await this.inventoryService.listInventory(vendorId);
    const filtered = input.lowStockOnly
      ? inventory.filter((item) => item.stockStatus === "low" || item.stockStatus === "out_of_stock")
      : inventory;

    return {
      inventory: filtered,
      meta: {
        vendorId,
        count: filtered.length,
        lowStockCount: inventory.filter((item) => item.stockStatus === "low").length,
        outOfStockCount: inventory.filter((item) => item.stockStatus === "out_of_stock").length,
      },
    };
  }
}

module.exports = SellerInventoryTool;
