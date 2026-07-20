const { RMA_STATUSES } = require("./SellerOperationsSettingsDefaults");

class ReturnService {
  constructor({ repository, inventoryService, audit, ordersBridge }) {
    this.repository = repository;
    this.inventoryService = inventoryService;
    this.audit = audit;
    this.ordersBridge = ordersBridge;
  }

  async createReturn(vendorId, payload = {}, meta = {}) {
    const record = await this.repository.createReturn(vendorId, {
      orderId: payload.orderId,
      productId: payload.productId,
      quantity: Number(payload.quantity || 1),
      reason: payload.reason || "",
      status: "requested",
    });

    await this.audit.record({
      platform: "sellerOperations",
      resource: record.returnId,
      action: "return.requested",
      actor: meta.actor || vendorId,
      newValue: record,
      orderId: payload.orderId,
    });

    return record;
  }

  async listReturns(vendorId, filters = {}) {
    return this.repository.listReturns(vendorId, filters);
  }

  async getReturn(vendorId, returnId) {
    const record = await this.repository.getReturn(returnId);
    if (!record || record.vendorId !== String(vendorId)) return null;
    return record;
  }

  async updateStatus(vendorId, returnId, status, meta = {}) {
    if (!RMA_STATUSES.includes(status)) {
      const error = new Error(`Invalid return status: ${status}`);
      error.statusCode = 400;
      throw error;
    }

    const existing = await this.getReturn(vendorId, returnId);
    if (!existing) {
      const error = new Error("Return not found");
      error.statusCode = 404;
      throw error;
    }

    const updated = await this.repository.updateReturn(returnId, { status });

    if (status === "received" && existing.productId) {
      await this.inventoryService.adjustInventory(
        vendorId,
        existing.productId,
        {
          quantityDelta: Number(existing.quantity || 1),
          reasonCode: "return",
          notes: `RMA ${returnId}`,
        },
        { actor: meta.actor || vendorId }
      );
    }

    if (status === "refunded" && existing.orderId && this.ordersBridge) {
      await this.ordersBridge.requestRefund(existing.orderId, meta.actor || vendorId);
    }

    await this.audit.record({
      platform: "sellerOperations",
      resource: returnId,
      action: "return.status.updated",
      actor: meta.actor || vendorId,
      oldValue: { status: existing.status },
      newValue: { status },
      orderId: existing.orderId,
    });

    return updated;
  }
}

module.exports = ReturnService;
