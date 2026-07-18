const DeliveryConfiguration = require("./DeliveryConfiguration");
const DeliveryValidation = require("./DeliveryValidation");
const DeliveryStateMachine = require("./DeliveryStateMachine");
const DeliveryTracking = require("./DeliveryTracking");
const DeliveryRepository = require("./DeliveryRepository");
const DeliveryHistory = require("./DeliveryHistory");
const DeliveryAnalytics = require("./DeliveryAnalytics");
const DeliveryHealth = require("./DeliveryHealth");

/**
 * Delivery Platform composition root — independent delivery domain.
 */
class DeliveryPlatform {
  constructor({ marketplaceCore, config, repository } = {}) {
    this.marketplaceCore = marketplaceCore || null;
    this.config = new DeliveryConfiguration(config);
    this.stateMachine = new DeliveryStateMachine();
    this.tracking = new DeliveryTracking({ prefix: this.config.trackingPrefix });
    this.repository = repository || new DeliveryRepository();
    this.history = new DeliveryHistory({ repository: this.repository });
    this.analytics = new DeliveryAnalytics({ config: this.config });
    this.health = new DeliveryHealth(this);
  }

  _buildError(message, statusCode = 400, reason = "VALIDATION_ERROR") {
    const error = new Error(message);
    error.statusCode = statusCode;
    error.reason = reason;
    return error;
  }

  _generateUniqueTrackingNumber() {
    let trackingNumber = this.tracking.generate();
    let attempts = 0;

    while (this.repository.trackingExists(trackingNumber) && attempts < 5) {
      trackingNumber = this.tracking.generate();
      attempts += 1;
    }

    if (this.repository.trackingExists(trackingNumber)) {
      throw this._buildError("Unable to generate unique tracking number", 500, "TRACKING_COLLISION");
    }

    return trackingNumber;
  }

  createDelivery(input = {}) {
    const sanitized = DeliveryValidation.sanitizeCreateInput(input);
    const validation = DeliveryValidation.validateCreateInput(sanitized);

    if (!validation.valid) {
      throw this._buildError(
        `Invalid delivery input: ${validation.fields.join(", ")}`,
        400,
        validation.reason || "VALIDATION_ERROR"
      );
    }

    if (this.repository.orderHasDelivery(sanitized.orderId)) {
      throw this._buildError("Delivery already exists for order", 409, "ORDER_DELIVERY_EXISTS");
    }

    const now = new Date().toISOString();
    const delivery = {
      deliveryId: this.repository.generateDeliveryId(),
      orderId: sanitized.orderId,
      customerId: sanitized.customerId,
      vendorId: sanitized.vendorId,
      courierId: null,
      pickupAddress: validation.pickupAddress,
      deliveryAddress: validation.deliveryAddress,
      deliveryFee: validation.deliveryFee,
      status: DeliveryStateMachine.STATUS.PENDING,
      trackingNumber: this._generateUniqueTrackingNumber(),
      createdAt: now,
      updatedAt: now,
      metadata: sanitized.metadata,
    };

    const created = this.repository.create(delivery);
    this.history.record(created.deliveryId, {
      type: "created",
      status: created.status,
      message: "Delivery created",
    });
    this.analytics.recordCreated();

    return created;
  }

  getDelivery(deliveryId) {
    const delivery = this.repository.findById(deliveryId);
    if (!delivery) {
      throw this._buildError("Delivery not found", 404, "NOT_FOUND");
    }
    return delivery;
  }

  getDeliveryByTracking(trackingNumber) {
    const normalized = this.tracking.normalize(trackingNumber);
    if (!normalized || !this.tracking.isValidFormat(normalized)) {
      throw this._buildError("Invalid tracking number", 400, "INVALID_TRACKING");
    }

    const delivery = this.repository.findByTrackingNumber(normalized);
    if (!delivery) {
      throw this._buildError("Delivery not found", 404, "NOT_FOUND");
    }
    return delivery;
  }

  getDeliveryByOrderId(orderId) {
    const cleaned = DeliveryValidation._cleanId(orderId);
    if (!cleaned) {
      throw this._buildError("Invalid order id", 400, "INVALID_ORDER_ID");
    }

    const delivery = this.repository.findByOrderId(cleaned);
    if (!delivery) {
      throw this._buildError("Delivery not found", 404, "NOT_FOUND");
    }
    return delivery;
  }

  assignCourier(deliveryId, courierId) {
    const delivery = this.getDelivery(deliveryId);
    const courierValidation = DeliveryValidation.validateCourierId(courierId);

    if (!courierValidation.valid) {
      throw this._buildError("Invalid courier id", 400, courierValidation.reason);
    }

    if (!this.stateMachine.canAssignCourier(delivery.status)) {
      throw this._buildError(
        `Cannot assign courier while delivery is ${delivery.status}`,
        409,
        "INVALID_ASSIGNMENT_STATE"
      );
    }

    const previousCourierId = delivery.courierId;
    const nextStatus =
      delivery.status === DeliveryStateMachine.STATUS.CONFIRMED
        ? DeliveryStateMachine.STATUS.ASSIGNED
        : delivery.status;

    const updated = this.repository.update(deliveryId, {
      courierId: courierValidation.courierId,
      status: nextStatus,
    });

    this.history.record(deliveryId, {
      type: previousCourierId ? "reassigned" : "assigned",
      status: updated.status,
      courierId: updated.courierId,
      previousCourierId,
      message: previousCourierId ? "Courier reassigned" : "Courier assigned",
    });
    this.analytics.recordAssignment();

    return updated;
  }

  removeCourierAssignment(deliveryId) {
    const delivery = this.getDelivery(deliveryId);

    if (delivery.status !== DeliveryStateMachine.STATUS.ASSIGNED) {
      throw this._buildError("Courier can only be removed while delivery is ASSIGNED", 409, "INVALID_STATE");
    }

    if (!delivery.courierId) {
      throw this._buildError("No courier assigned", 409, "NO_COURIER");
    }

    const previousCourierId = delivery.courierId;
    const updated = this.repository.update(deliveryId, {
      courierId: null,
      status: DeliveryStateMachine.STATUS.CONFIRMED,
    });

    this.history.record(deliveryId, {
      type: "unassigned",
      status: updated.status,
      previousCourierId,
      message: "Courier assignment removed",
    });

    return updated;
  }

  updateStatus(deliveryId, nextStatus, { reason = null } = {}) {
    const delivery = this.getDelivery(deliveryId);
    const statusValidation = DeliveryValidation.validateStatusInput(nextStatus);

    if (!statusValidation.valid) {
      throw this._buildError("Invalid delivery status", 400, statusValidation.reason);
    }

    const transition = this.stateMachine.assertTransition(delivery.status, statusValidation.status);
    if (!transition.valid) {
      throw this._buildError(transition.message, 409, transition.reason);
    }

    const updated = this.repository.update(deliveryId, { status: transition.status });

    this.history.record(deliveryId, {
      type: "status_changed",
      status: updated.status,
      previousStatus: delivery.status,
      reason,
      message: `Status changed to ${updated.status}`,
    });
    this.analytics.recordStatusChange();

    if (updated.status === DeliveryStateMachine.STATUS.DELIVERED) {
      const durationMs = Date.parse(updated.updatedAt) - Date.parse(updated.createdAt);
      this.analytics.recordLifecycleDuration(durationMs);
    }

    return updated;
  }

  cancelDelivery(deliveryId, { reason = null } = {}) {
    const delivery = this.getDelivery(deliveryId);

    if (this.stateMachine.isTerminal(delivery.status)) {
      throw this._buildError(`Cannot cancel delivery in ${delivery.status} state`, 409, "INVALID_STATE");
    }

    const updated = this.updateStatus(deliveryId, DeliveryStateMachine.STATUS.CANCELLED, { reason });

    this.history.record(deliveryId, {
      type: "cancelled",
      status: updated.status,
      reason,
      message: "Delivery cancelled",
    });
    this.analytics.recordCancellation();

    return updated;
  }

  listDeliveries(filters = {}) {
    const status = filters.status ? this.stateMachine.normalize(filters.status) : null;
    if (filters.status && !status) {
      throw this._buildError("Invalid status filter", 400, "INVALID_STATUS_FILTER");
    }

    return this.repository.list({
      customerId: filters.customerId,
      vendorId: filters.vendorId,
      courierId: filters.courierId,
      orderId: filters.orderId,
      status,
    });
  }

  getDeliveryHistory(deliveryId) {
    this.getDelivery(deliveryId);
    return this.history.getHistory(deliveryId);
  }

  getMetrics() {
    return this.analytics.getSummary();
  }
}

module.exports = DeliveryPlatform;
