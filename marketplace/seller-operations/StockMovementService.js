const { MOVEMENT_TYPES } = require("./SellerOperationsSettingsDefaults");

class StockMovementService {
  constructor({ repository, audit }) {
    this.repository = repository;
    this.audit = audit;
  }

  async recordMovement(payload = {}) {
    const type = payload.type || "adjustment";
    if (!MOVEMENT_TYPES.includes(type)) {
      const error = new Error(`Invalid movement type: ${type}`);
      error.statusCode = 400;
      throw error;
    }

    const movement = await this.repository.createStockMovement({
      vendorId: String(payload.vendorId),
      productId: String(payload.productId),
      type,
      quantity: Number(payload.quantity || 0),
      reasonCode: payload.reasonCode || type,
      notes: payload.notes || "",
      actor: payload.actor || "system",
      referenceType: payload.referenceType || null,
      referenceId: payload.referenceId || null,
    });

    await this.audit.record({
      platform: "sellerOperations",
      resource: movement.movementId,
      action: "stock.movement.recorded",
      actor: payload.actor || "system",
      newValue: movement,
      metadata: {
        vendorId: payload.vendorId,
        productId: payload.productId,
        type,
      },
    });

    return movement;
  }

  async listMovements(filters = {}) {
    return this.repository.listStockMovements(filters);
  }
}

module.exports = StockMovementService;
