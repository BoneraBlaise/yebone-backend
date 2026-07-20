class SupplierService {
  constructor({ repository, audit }) {
    this.repository = repository;
    this.audit = audit;
  }

  async createSupplier(vendorId, payload = {}, meta = {}) {
    const supplier = await this.repository.createSupplier(vendorId, {
      name: payload.name,
      contactName: payload.contactName || "",
      email: payload.email || "",
      phone: payload.phone || "",
      address: payload.address || "",
      status: payload.status || "active",
      notes: payload.notes || "",
    });

    await this.audit.record({
      platform: "sellerOperations",
      resource: supplier.supplierId,
      action: "supplier.created",
      actor: meta.actor || vendorId,
      newValue: supplier,
    });

    return supplier;
  }

  async listSuppliers(vendorId) {
    return this.repository.listSuppliers(vendorId);
  }

  async getSupplier(vendorId, supplierId) {
    const supplier = await this.repository.getSupplier(supplierId);
    if (!supplier || supplier.vendorId !== String(vendorId)) return null;
    const purchaseOrders = await this.repository.listPurchaseOrders(vendorId, {});
    return {
      ...supplier,
      purchaseHistory: purchaseOrders.filter((po) => po.supplierId === supplierId),
    };
  }

  async updateSupplier(vendorId, supplierId, patch = {}, meta = {}) {
    const existing = await this.repository.getSupplier(supplierId);
    if (!existing || existing.vendorId !== String(vendorId)) {
      const error = new Error("Supplier not found");
      error.statusCode = 404;
      throw error;
    }

    const updated = await this.repository.updateSupplier(supplierId, patch);
    await this.audit.record({
      platform: "sellerOperations",
      resource: supplierId,
      action: "supplier.updated",
      actor: meta.actor || vendorId,
      oldValue: existing,
      newValue: updated,
    });
    return updated;
  }
}

module.exports = SupplierService;
