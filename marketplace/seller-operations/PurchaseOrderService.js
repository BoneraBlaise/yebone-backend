const { PO_STATUSES } = require("./SellerOperationsSettingsDefaults");

class PurchaseOrderService {
  constructor({ repository, inventoryService, stockMovementService, audit }) {
    this.repository = repository;
    this.inventoryService = inventoryService;
    this.stockMovementService = stockMovementService;
    this.audit = audit;
  }

  async createPurchaseOrder(vendorId, payload = {}, meta = {}) {
    const po = await this.repository.createPurchaseOrder(vendorId, {
      supplierId: payload.supplierId,
      lineItems: payload.lineItems || [],
      expectedDelivery: payload.expectedDelivery || null,
      status: payload.status || "draft",
      notes: payload.notes || "",
    });

    await this.audit.record({
      platform: "sellerOperations",
      resource: po.purchaseOrderId,
      action: "purchase_order.created",
      actor: meta.actor || vendorId,
      newValue: po,
    });

    return po;
  }

  async listPurchaseOrders(vendorId, filters = {}) {
    return this.repository.listPurchaseOrders(vendorId, filters);
  }

  async getPurchaseOrder(vendorId, purchaseOrderId) {
    const po = await this.repository.getPurchaseOrder(purchaseOrderId);
    if (!po || po.vendorId !== String(vendorId)) return null;
    return po;
  }

  async updateStatus(vendorId, purchaseOrderId, status, meta = {}) {
    if (!PO_STATUSES.includes(status)) {
      const error = new Error(`Invalid purchase order status: ${status}`);
      error.statusCode = 400;
      throw error;
    }

    const existing = await this.getPurchaseOrder(vendorId, purchaseOrderId);
    if (!existing) {
      const error = new Error("Purchase order not found");
      error.statusCode = 404;
      throw error;
    }

    const updated = await this.repository.updatePurchaseOrder(purchaseOrderId, { status });
    await this.audit.record({
      platform: "sellerOperations",
      resource: purchaseOrderId,
      action: "purchase_order.status.updated",
      actor: meta.actor || vendorId,
      oldValue: { status: existing.status },
      newValue: { status },
    });
    return updated;
  }

  async receiveStock(vendorId, purchaseOrderId, receipts = [], meta = {}) {
    const po = await this.getPurchaseOrder(vendorId, purchaseOrderId);
    if (!po) {
      const error = new Error("Purchase order not found");
      error.statusCode = 404;
      throw error;
    }
    if (po.status === "cancelled") {
      const error = new Error("Cannot receive stock for cancelled purchase order");
      error.statusCode = 400;
      throw error;
    }

    const receivedQuantities = { ...(po.receivedQuantities || {}) };
    for (const receipt of receipts) {
      const productId = String(receipt.productId);
      const qty = Number(receipt.quantity || 0);
      if (qty <= 0) continue;

      receivedQuantities[productId] = (receivedQuantities[productId] || 0) + qty;
      await this.inventoryService.adjustInventory(
        vendorId,
        productId,
        { quantityDelta: qty, reasonCode: "purchase", notes: `PO ${purchaseOrderId}` },
        { actor: meta.actor || vendorId }
      );

      if (this.stockMovementService) {
        await this.stockMovementService.recordMovement({
          vendorId,
          productId,
          type: "purchase",
          quantity: qty,
          reasonCode: "purchase",
          notes: `Received from PO ${purchaseOrderId}`,
          actor: meta.actor || vendorId,
          referenceType: "purchase_order",
          referenceId: purchaseOrderId,
        });
      }
    }

    const allReceived = (po.lineItems || []).every((line) => {
      const ordered = Number(line.quantity || 0);
      const received = Number(receivedQuantities[String(line.productId)] || 0);
      return received >= ordered;
    });
    const anyReceived = Object.values(receivedQuantities).some((qty) => qty > 0);
    const nextStatus = allReceived ? "received" : anyReceived ? "partially_received" : po.status;

    const updated = await this.repository.updatePurchaseOrder(purchaseOrderId, {
      receivedQuantities,
      status: nextStatus === "draft" ? "ordered" : nextStatus,
    });

    await this.audit.record({
      platform: "sellerOperations",
      resource: purchaseOrderId,
      action: "purchase_order.received",
      actor: meta.actor || vendorId,
      newValue: { receipts, status: updated.status },
    });

    return updated;
  }
}

module.exports = PurchaseOrderService;
