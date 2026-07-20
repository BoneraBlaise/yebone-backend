const { REASON_CODES } = require("./SellerOperationsSettingsDefaults");

class InventoryService {
  constructor({ repository, catalogBridge, stockMovementService, lowStockAlertService, audit }) {
    this.repository = repository;
    this.catalogBridge = catalogBridge;
    this.stockMovementService = stockMovementService;
    this.lowStockAlertService = lowStockAlertService;
    this.audit = audit;
  }

  async _resolveSnapshot(vendorId, productId) {
    const product = (await this.catalogBridge.getProduct(productId)) || { _id: productId, stock: 0 };
    const record = await this.repository.upsertInventory(vendorId, productId, {});
    const base = this.catalogBridge.getInventorySummary(product);

    const currentStock = base.stock;
    const reservedStock = Number(record.reservedStock || 0);
    const incomingStock = Number(record.incomingStock || 0);
    const damagedStock = Number(record.damagedStock || 0);
    const availableStock = Math.max(currentStock - reservedStock - damagedStock, 0);

    return {
      ...record,
      currentStock,
      reservedStock,
      incomingStock,
      damagedStock,
      availableStock,
      isOutOfStock: availableStock <= 0,
      stockStatus: this._resolveStockStatus(record, availableStock),
      productName: product.name || null,
      unitPrice: Number(product.discountPrice || product.originalPrice || 0),
    };
  }

  _resolveStockStatus(record, availableStock) {
    if (availableStock <= 0) return "out_of_stock";
    if (availableStock <= Number(record.criticalStockThreshold || 0)) return "critical";
    if (availableStock <= Number(record.lowStockThreshold || 0)) return "low";
    return "healthy";
  }

  async getInventory(vendorId, productId) {
    return this._resolveSnapshot(vendorId, productId);
  }

  async listInventory(vendorId) {
    const records = await this.repository.listInventory(vendorId);
    const snapshots = [];
    for (const record of records) {
      snapshots.push(await this._resolveSnapshot(vendorId, record.productId));
    }
    return snapshots;
  }

  async ensureInventory(vendorId, productId, defaults = {}) {
    await this.repository.upsertInventory(vendorId, productId, defaults);
    return this._resolveSnapshot(vendorId, productId);
  }

  async updateThresholds(vendorId, productId, thresholds = {}, meta = {}) {
    const record = await this.repository.upsertInventory(vendorId, productId, {
      lowStockThreshold: thresholds.lowStockThreshold,
      criticalStockThreshold: thresholds.criticalStockThreshold,
    });
    await this.audit.record({
      platform: "sellerOperations",
      resource: productId,
      action: "inventory.thresholds.updated",
      actor: meta.actor || vendorId,
      newValue: thresholds,
    });
    return this._resolveSnapshot(vendorId, productId);
  }

  async adjustInventory(vendorId, productId, input = {}, meta = {}) {
    const reasonCode = input.reasonCode || "adjustment";
    if (!REASON_CODES.includes(reasonCode)) {
      const error = new Error(`Invalid reason code: ${reasonCode}`);
      error.statusCode = 400;
      throw error;
    }

    const snapshot = await this._resolveSnapshot(vendorId, productId);
    const delta = Number(input.quantityDelta || 0);
    const nextStock = Math.max(snapshot.currentStock + delta, 0);

    await this.catalogBridge.updateCatalogStock(productId, nextStock, { vendorId });

    const patch = {};
    if (input.reservedStock !== undefined) patch.reservedStock = Number(input.reservedStock);
    if (input.incomingStock !== undefined) patch.incomingStock = Number(input.incomingStock);
    if (input.damagedStock !== undefined) patch.damagedStock = Number(input.damagedStock);
    if (input.notes !== undefined) patch.notes = input.notes;
    if (Object.keys(patch).length) await this.repository.upsertInventory(vendorId, productId, patch);

    const historyEntry = {
      at: new Date().toISOString(),
      reasonCode,
      quantityDelta: delta,
      notes: input.notes || "",
      actor: meta.actor || vendorId,
    };
    await this.repository.appendInventoryHistory(vendorId, productId, historyEntry);

    if (this.stockMovementService) {
      await this.stockMovementService.recordMovement({
        vendorId,
        productId,
        type: reasonCode === "damage" ? "damage" : "adjustment",
        quantity: delta,
        reasonCode,
        notes: input.notes || "",
        actor: meta.actor || vendorId,
        referenceType: "inventory_adjustment",
        referenceId: productId,
      });
    }

    await this.audit.record({
      platform: "sellerOperations",
      resource: productId,
      action: "inventory.adjusted",
      actor: meta.actor || vendorId,
      oldValue: { currentStock: snapshot.currentStock },
      newValue: { currentStock: nextStock, reasonCode },
      reason: input.notes || null,
    });

    const updated = await this._resolveSnapshot(vendorId, productId);
    if (this.lowStockAlertService) {
      await this.lowStockAlertService.evaluate(vendorId, updated, meta);
    }
    return updated;
  }
}

module.exports = InventoryService;
