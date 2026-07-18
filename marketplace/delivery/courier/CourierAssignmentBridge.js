const DeliveryStateMachine = require("../DeliveryStateMachine");

/**
 * Orchestrates courier assignment with DeliveryPlatform public APIs only.
 */
class CourierAssignmentBridge {
  constructor({ deliveryPlatform }) {
    if (!deliveryPlatform) {
      throw new Error("CourierAssignmentBridge requires deliveryPlatform");
    }
    this.deliveryPlatform = deliveryPlatform;
  }

  isDeliveryAssignable(delivery) {
    if (!delivery) return { valid: false, reason: "DELIVERY_NOT_FOUND" };
    if (DeliveryStateMachine.TERMINAL.includes(delivery.status)) {
      return { valid: false, reason: "DELIVERY_COMPLETED" };
    }
    return { valid: true };
  }

  assignDelivery(deliveryId, courierId, { actor = "system" } = {}) {
    const delivery = this.deliveryPlatform.getDelivery(deliveryId);
    const assignable = this.isDeliveryAssignable(delivery);
    if (!assignable.valid) {
      const error = new Error(`Delivery cannot be assigned: ${assignable.reason}`);
      error.statusCode = 409;
      error.reason = assignable.reason;
      throw error;
    }

    return this.deliveryPlatform.assignCourier(deliveryId, courierId, { actor });
  }

  removeAssignment(deliveryId, { actor = "system" } = {}) {
    this.deliveryPlatform.getDelivery(deliveryId);
    return this.deliveryPlatform.removeCourierAssignment(deliveryId, { actor });
  }

  reassignDelivery(deliveryId, courierId, { actor = "system" } = {}) {
    const delivery = this.deliveryPlatform.getDelivery(deliveryId);
    const assignable = this.isDeliveryAssignable(delivery);
    if (!assignable.valid) {
      const error = new Error(`Delivery cannot be reassigned: ${assignable.reason}`);
      error.statusCode = 409;
      error.reason = assignable.reason;
      throw error;
    }

    return this.deliveryPlatform.assignCourier(deliveryId, courierId, { actor });
  }
}

module.exports = CourierAssignmentBridge;
