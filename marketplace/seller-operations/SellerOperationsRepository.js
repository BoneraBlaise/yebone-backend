const crypto = require("crypto");

class SellerOperationsRepository {
  constructor({ useMemoryOnly = false, models = {} } = {}) {
    this.useMemoryOnly = useMemoryOnly;
    this.models = models;
    this.inventory = new Map();
    this.suppliers = new Map();
    this.purchaseOrders = new Map();
    this.stockMovements = new Map();
    this.returns = new Map();
    this.alerts = new Map();
    this.skuRegistry = new Map();
    this.bulkJobs = new Map();
  }

  setModels(models = {}) {
    this.models = { ...this.models, ...models };
  }

  _id(prefix) {
    return `${prefix}_${Date.now()}_${crypto.randomBytes(3).toString("hex")}`;
  }

  _memKey(vendorId, productId) {
    return `${String(vendorId)}::${String(productId)}`;
  }

  resetForTests() {
    this.inventory.clear();
    this.suppliers.clear();
    this.purchaseOrders.clear();
    this.stockMovements.clear();
    this.returns.clear();
    this.alerts.clear();
    this.skuRegistry.clear();
    this.bulkJobs.clear();
  }

  async upsertInventory(vendorId, productId, patch = {}) {
    const key = this._memKey(vendorId, productId);
    const existing = this.inventory.get(key) || {
      inventoryId: this._id("inv"),
      vendorId: String(vendorId),
      productId: String(productId),
      reservedStock: 0,
      incomingStock: 0,
      damagedStock: 0,
      lowStockThreshold: 5,
      criticalStockThreshold: 2,
      notes: "",
      history: [],
    };
    const updated = { ...existing, ...patch, vendorId: String(vendorId), productId: String(productId) };
    this.inventory.set(key, updated);
    return structuredClone(updated);
  }

  async getInventory(vendorId, productId) {
    const item = this.inventory.get(this._memKey(vendorId, productId));
    return item ? structuredClone(item) : null;
  }

  async listInventory(vendorId) {
    return [...this.inventory.values()]
      .filter((item) => item.vendorId === String(vendorId))
      .map((item) => structuredClone(item));
  }

  async listAllInventory() {
    return [...this.inventory.values()].map((item) => structuredClone(item));
  }

  async appendInventoryHistory(vendorId, productId, entry) {
    const record = await this.getInventory(vendorId, productId);
    if (!record) return null;
    record.history = [...(record.history || []), entry].slice(-100);
    this.inventory.set(this._memKey(vendorId, productId), record);
    return structuredClone(record);
  }

  async createSupplier(vendorId, payload) {
    const supplier = {
      supplierId: payload.supplierId || this._id("sup"),
      vendorId: String(vendorId),
      status: payload.status || "active",
      purchaseOrderIds: [],
      ...payload,
    };
    this.suppliers.set(supplier.supplierId, supplier);
    return structuredClone(supplier);
  }

  async getSupplier(supplierId) {
    const item = this.suppliers.get(String(supplierId));
    return item ? structuredClone(item) : null;
  }

  async listSuppliers(vendorId) {
    return [...this.suppliers.values()]
      .filter((item) => item.vendorId === String(vendorId))
      .map((item) => structuredClone(item));
  }

  async listAllSuppliers() {
    return [...this.suppliers.values()].map((item) => structuredClone(item));
  }

  async updateSupplier(supplierId, patch) {
    const existing = this.suppliers.get(String(supplierId));
    if (!existing) return null;
    const updated = { ...existing, ...patch, supplierId: existing.supplierId };
    this.suppliers.set(existing.supplierId, updated);
    return structuredClone(updated);
  }

  async createPurchaseOrder(vendorId, payload) {
    const po = {
      purchaseOrderId: payload.purchaseOrderId || this._id("po"),
      vendorId: String(vendorId),
      status: payload.status || "draft",
      lineItems: payload.lineItems || [],
      receivedQuantities: payload.receivedQuantities || {},
      ...payload,
    };
    this.purchaseOrders.set(po.purchaseOrderId, po);
    return structuredClone(po);
  }

  async getPurchaseOrder(purchaseOrderId) {
    const item = this.purchaseOrders.get(String(purchaseOrderId));
    return item ? structuredClone(item) : null;
  }

  async listPurchaseOrders(vendorId, filters = {}) {
    return [...this.purchaseOrders.values()]
      .filter((item) => {
        if (vendorId && item.vendorId !== String(vendorId)) return false;
        if (filters.status && item.status !== filters.status) return false;
        return true;
      })
      .map((item) => structuredClone(item));
  }

  async updatePurchaseOrder(purchaseOrderId, patch) {
    const existing = this.purchaseOrders.get(String(purchaseOrderId));
    if (!existing) return null;
    const updated = { ...existing, ...patch, purchaseOrderId: existing.purchaseOrderId };
    this.purchaseOrders.set(existing.purchaseOrderId, updated);
    return structuredClone(updated);
  }

  async createStockMovement(payload) {
    const movement = {
      movementId: payload.movementId || this._id("mov"),
      ...payload,
      createdAt: payload.createdAt || new Date().toISOString(),
    };
    this.stockMovements.set(movement.movementId, movement);
    return structuredClone(movement);
  }

  async listStockMovements(filters = {}) {
    return [...this.stockMovements.values()]
      .filter((item) => {
        if (filters.vendorId && item.vendorId !== String(filters.vendorId)) return false;
        if (filters.productId && item.productId !== String(filters.productId)) return false;
        if (filters.type && item.type !== filters.type) return false;
        return true;
      })
      .sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)))
      .map((item) => structuredClone(item));
  }

  async createReturn(vendorId, payload) {
    const record = {
      returnId: payload.returnId || this._id("rma"),
      vendorId: String(vendorId),
      status: payload.status || "requested",
      ...payload,
    };
    this.returns.set(record.returnId, record);
    return structuredClone(record);
  }

  async getReturn(returnId) {
    const item = this.returns.get(String(returnId));
    return item ? structuredClone(item) : null;
  }

  async listReturns(vendorId, filters = {}) {
    return [...this.returns.values()]
      .filter((item) => {
        if (vendorId && item.vendorId !== String(vendorId)) return false;
        if (filters.status && item.status !== filters.status) return false;
        return true;
      })
      .map((item) => structuredClone(item));
  }

  async updateReturn(returnId, patch) {
    const existing = this.returns.get(String(returnId));
    if (!existing) return null;
    const updated = { ...existing, ...patch, returnId: existing.returnId };
    this.returns.set(existing.returnId, updated);
    return structuredClone(updated);
  }

  async createAlert(vendorId, payload) {
    const alert = {
      alertId: payload.alertId || this._id("alert"),
      vendorId: String(vendorId),
      read: false,
      createdAt: new Date().toISOString(),
      ...payload,
    };
    this.alerts.set(alert.alertId, alert);
    return structuredClone(alert);
  }

  async listAlerts(vendorId, filters = {}) {
    return [...this.alerts.values()]
      .filter((item) => {
        if (item.vendorId !== String(vendorId)) return false;
        if (filters.unreadOnly && item.read) return false;
        return true;
      })
      .sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)))
      .map((item) => structuredClone(item));
  }

  async registerSku(vendorId, sku, productId) {
    const key = `${String(vendorId)}::${String(sku).toUpperCase()}`;
    if (this.skuRegistry.has(key)) {
      const existing = this.skuRegistry.get(key);
      if (existing.productId !== String(productId)) {
        const error = new Error("SKU already assigned to another product");
        error.statusCode = 409;
        error.reason = "DUPLICATE_SKU";
        throw error;
      }
    }
    this.skuRegistry.set(key, {
      vendorId: String(vendorId),
      sku: String(sku).toUpperCase(),
      productId: String(productId),
    });
    return { sku: String(sku).toUpperCase(), productId: String(productId) };
  }

  async findBySku(vendorId, sku) {
    const entry = this.skuRegistry.get(`${String(vendorId)}::${String(sku).toUpperCase()}`);
    return entry ? structuredClone(entry) : null;
  }

  async findByBarcode(vendorId, barcode) {
    for (const record of this.inventory.values()) {
      if (record.vendorId === String(vendorId) && record.barcode === String(barcode)) {
        return structuredClone(record);
      }
    }
    return null;
  }

  async createBulkJob(vendorId, payload) {
    const job = {
      jobId: payload.jobId || this._id("bulk"),
      vendorId: String(vendorId),
      status: payload.status || "completed",
      createdAt: new Date().toISOString(),
      ...payload,
    };
    this.bulkJobs.set(job.jobId, job);
    return structuredClone(job);
  }

  async listBulkJobs(vendorId) {
    return [...this.bulkJobs.values()]
      .filter((item) => item.vendorId === String(vendorId))
      .map((item) => structuredClone(item));
  }
}

module.exports = SellerOperationsRepository;
