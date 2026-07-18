const CourierConfiguration = require("./CourierConfiguration");
const CourierValidation = require("./CourierValidation");
const CourierRepository = require("./CourierRepository");
const CourierHistory = require("./CourierHistory");
const CourierAnalytics = require("./CourierAnalytics");
const CourierHealth = require("./CourierHealth");
const CourierAssignmentBridge = require("./CourierAssignmentBridge");

/**
 * Courier Platform composition root — extends delivery without modifying foundation logic.
 */
class CourierPlatform {
  constructor({ deliveryPlatform, config, repository } = {}) {
    if (!deliveryPlatform) {
      throw new Error("CourierPlatform requires deliveryPlatform");
    }

    this.deliveryPlatform = deliveryPlatform;
    this.config = new CourierConfiguration(config);
    this.repository = repository || new CourierRepository();
    this.history = new CourierHistory();
    this.analytics = new CourierAnalytics({ config: this.config });
    this.assignmentBridge = new CourierAssignmentBridge({ deliveryPlatform });
    this.health = new CourierHealth(this);
  }

  _buildError(message, statusCode = 400, reason = "VALIDATION_ERROR") {
    const error = new Error(message);
    error.statusCode = statusCode;
    error.reason = reason;
    return error;
  }

  _syncAvailability(courier) {
    const atCapacity =
      courier.capacity.currentActiveDeliveries >= courier.capacity.maximumActiveDeliveries;
    if (courier.status !== "ACTIVE") {
      return courier.availability;
    }
    if (atCapacity && courier.availability === "AVAILABLE") {
      return "BUSY";
    }
    if (!atCapacity && courier.availability === "BUSY") {
      return "AVAILABLE";
    }
    return courier.availability;
  }

  registerCourier(input = {}) {
    const sanitized = CourierValidation.sanitizeRegisterInput(input);
    const validation = CourierValidation.validateRegisterInput(sanitized);

    if (!validation.valid) {
      throw this._buildError(
        `Invalid courier input: ${(validation.fields || []).join(", ")}`,
        400,
        validation.reason
      );
    }

    if (this.repository.phoneExists(sanitized.phoneNumber)) {
      throw this._buildError("Phone number already registered", 409, "PHONE_EXISTS");
    }

    const now = new Date().toISOString();
    const courier = {
      courierId: this.repository.generateCourierId(),
      fullName: sanitized.fullName,
      phoneNumber: sanitized.phoneNumber,
      email: sanitized.email,
      vehicleType: sanitized.vehicleType,
      vehiclePlate: sanitized.vehiclePlate,
      status: "INACTIVE",
      availability: "OFFLINE",
      capacity: {
        maximumActiveDeliveries: validation.maximumActiveDeliveries,
        currentActiveDeliveries: 0,
      },
      activeDeliveries: [],
      completedDeliveries: 0,
      createdAt: now,
      updatedAt: now,
      metadata: sanitized.metadata,
    };

    const created = this.repository.create(courier);
    this.history.record(created.courierId, {
      type: "registered",
      status: created.status,
      availability: created.availability,
      note: "Courier registered",
    });
    this.analytics.recordRegistered();

    return created;
  }

  updateCourier(courierId, input = {}, { actor = "system" } = {}) {
    const existing = this.getCourier(courierId);
    const sanitized = CourierValidation.sanitizeUpdateInput(input);

    if (sanitized.phoneNumber && this.repository.phoneExists(sanitized.phoneNumber, courierId)) {
      throw this._buildError("Phone number already registered", 409, "PHONE_EXISTS");
    }

    if (sanitized.maximumActiveDeliveries !== undefined) {
      const capacity = CourierValidation.validateCapacity(sanitized.maximumActiveDeliveries);
      if (!capacity.valid) {
        throw this._buildError("Invalid capacity", 400, capacity.reason);
      }
      if (capacity.value < existing.capacity.currentActiveDeliveries) {
        throw this._buildError("Capacity below current active deliveries", 409, "CAPACITY_TOO_LOW");
      }
    }

    const patch = {
      ...(sanitized.fullName !== undefined ? { fullName: sanitized.fullName } : {}),
      ...(sanitized.phoneNumber !== undefined ? { phoneNumber: sanitized.phoneNumber } : {}),
      ...(sanitized.email !== undefined ? { email: sanitized.email } : {}),
      ...(sanitized.vehicleType !== undefined ? { vehicleType: sanitized.vehicleType } : {}),
      ...(sanitized.vehiclePlate !== undefined ? { vehiclePlate: sanitized.vehiclePlate } : {}),
      ...(sanitized.metadata !== undefined ? { metadata: sanitized.metadata } : {}),
    };

    if (sanitized.maximumActiveDeliveries !== undefined) {
      patch.capacity = {
        ...existing.capacity,
        maximumActiveDeliveries: sanitized.maximumActiveDeliveries,
      };
    }

    const updated = this.repository.update(courierId, patch);
    this.history.record(courierId, {
      type: "updated",
      actor,
      note: "Courier profile updated",
    });

    return updated;
  }

  getCourier(courierId) {
    const courier = this.repository.findById(courierId);
    if (!courier) {
      throw this._buildError("Courier not found", 404, "NOT_FOUND");
    }
    return courier;
  }

  listCouriers(filters = {}) {
    const status = filters.status ? CourierValidation.validateStatus(filters.status) : null;
    if (filters.status && !status.valid) {
      throw this._buildError("Invalid status filter", 400, "INVALID_STATUS_FILTER");
    }

    const availability = filters.availability
      ? CourierValidation.validateAvailability(filters.availability)
      : null;
    if (filters.availability && !availability.valid) {
      throw this._buildError("Invalid availability filter", 400, "INVALID_AVAILABILITY_FILTER");
    }

    return this.repository.list({
      status: status?.status,
      availability: availability?.availability,
    });
  }

  activateCourier(courierId, { actor = "system" } = {}) {
    const courier = this.getCourier(courierId);
    if (courier.status === "ACTIVE") return courier;

    const updated = this.repository.update(courierId, { status: "ACTIVE" });
    this.history.record(courierId, {
      type: "status_changed",
      status: "ACTIVE",
      actor,
      note: "Courier activated",
    });

    return updated;
  }

  deactivateCourier(courierId, { actor = "system" } = {}) {
    const courier = this.getCourier(courierId);
    if (courier.status === "INACTIVE") return courier;

    const updated = this.repository.update(courierId, {
      status: "INACTIVE",
      availability: "OFFLINE",
    });

    this.history.record(courierId, {
      type: "status_changed",
      status: "INACTIVE",
      availability: "OFFLINE",
      actor,
      note: "Courier deactivated",
    });
    this.analytics.recordAvailabilityChange();

    return updated;
  }

  suspendCourier(courierId, { actor = "system", reason = null } = {}) {
    const updated = this.repository.update(courierId, {
      status: "SUSPENDED",
      availability: "OFFLINE",
    });

    this.history.record(courierId, {
      type: "status_changed",
      status: "SUSPENDED",
      availability: "OFFLINE",
      actor,
      note: reason || "Courier suspended",
    });

    return updated;
  }

  setAvailability(courierId, availability, { actor = "system" } = {}) {
    const courier = this.getCourier(courierId);
    const validation = CourierValidation.validateAvailability(availability);
    if (!validation.valid) {
      throw this._buildError("Invalid availability", 400, validation.reason);
    }

    if (courier.status !== "ACTIVE") {
      throw this._buildError("Courier must be ACTIVE to change availability", 409, "INACTIVE_COURIER");
    }

    if (validation.availability === "AVAILABLE") {
      const atCapacity =
        courier.capacity.currentActiveDeliveries >= courier.capacity.maximumActiveDeliveries;
      if (atCapacity) {
        throw this._buildError("Courier at capacity cannot be AVAILABLE", 409, "AT_CAPACITY");
      }
    }

    const updated = this.repository.update(courierId, { availability: validation.availability });
    this.history.record(courierId, {
      type: "availability_changed",
      availability: validation.availability,
      actor,
      note: `Availability set to ${validation.availability}`,
    });
    this.analytics.recordAvailabilityChange();

    return updated;
  }

  _assertAssignable(courier) {
    if (courier.status !== "ACTIVE") {
      return { valid: false, reason: "COURIER_NOT_ACTIVE", statusCode: 409 };
    }
    if (courier.capacity.currentActiveDeliveries >= courier.capacity.maximumActiveDeliveries) {
      return { valid: false, reason: "CAPACITY_EXCEEDED", statusCode: 409 };
    }
    if (courier.availability !== "AVAILABLE") {
      return { valid: false, reason: "COURIER_NOT_AVAILABLE", statusCode: 409 };
    }
    return { valid: true };
  }

  _releaseDeliveryFromCourier(courierId, deliveryId, { actor = "system", note = null } = {}) {
    const courier = this.repository.findById(courierId);
    if (!courier || !courier.activeDeliveries.includes(deliveryId)) {
      return null;
    }

    const activeDeliveries = courier.activeDeliveries.filter((id) => id !== deliveryId);
    const currentActiveDeliveries = Math.max(0, courier.capacity.currentActiveDeliveries - 1);
    const nextAvailability = this._syncAvailability({
      ...courier,
      status: "ACTIVE",
      capacity: { ...courier.capacity, currentActiveDeliveries },
      availability: courier.availability === "OFFLINE" ? "OFFLINE" : "AVAILABLE",
    });

    const updated = this.repository.update(courierId, {
      activeDeliveries,
      capacity: {
        ...courier.capacity,
        currentActiveDeliveries,
      },
      availability: nextAvailability,
    });

    this.history.record(courierId, {
      type: "assignment_removed",
      deliveryId,
      actor,
      note: note || `Delivery ${deliveryId} unassigned`,
    });

    return updated;
  }

  assignDelivery(courierId, deliveryId, { actor = "system" } = {}) {
    const courier = this.getCourier(courierId);
    const assignable = this._assertAssignable(courier);

    if (!assignable.valid) {
      this.analytics.recordAssignmentFailure();
      throw this._buildError(`Cannot assign delivery: ${assignable.reason}`, assignable.statusCode, assignable.reason);
    }

    const delivery = this.deliveryPlatform.getDelivery(deliveryId);

    if (delivery.courierId && delivery.courierId !== courierId) {
      this._releaseDeliveryFromCourier(delivery.courierId, deliveryId, {
        actor,
        note: `Delivery ${deliveryId} reassigned to ${courierId}`,
      });
    }

    if (courier.activeDeliveries.includes(deliveryId)) {
      const updatedDelivery = this.assignmentBridge.reassignDelivery(deliveryId, courierId, { actor });
      return { courier, delivery: updatedDelivery };
    }

    const updatedDelivery = delivery.courierId
      ? this.assignmentBridge.reassignDelivery(deliveryId, courierId, { actor })
      : this.assignmentBridge.assignDelivery(deliveryId, courierId, { actor });

    const activeDeliveries = [...courier.activeDeliveries, deliveryId];
    const currentActiveDeliveries = courier.capacity.currentActiveDeliveries + 1;

    const nextAvailability = this._syncAvailability({
      ...courier,
      capacity: { ...courier.capacity, currentActiveDeliveries },
    });

    const updatedCourier = this.repository.update(courierId, {
      activeDeliveries,
      capacity: {
        ...courier.capacity,
        currentActiveDeliveries,
      },
      availability: nextAvailability,
    });

    this.history.record(courierId, {
      type: delivery.courierId && delivery.courierId === courierId ? "reassigned" : "assigned",
      deliveryId,
      actor,
      note: `Delivery ${deliveryId} assigned`,
    });
    this.analytics.recordAssignment();
    this.analytics.recordCapacityUtilization(
      updatedCourier.capacity.currentActiveDeliveries,
      updatedCourier.capacity.maximumActiveDeliveries
    );

    return { courier: updatedCourier, delivery: updatedDelivery };
  }

  removeAssignment(courierId, deliveryId, { actor = "system" } = {}) {
    const courier = this.getCourier(courierId);

    if (!courier.activeDeliveries.includes(deliveryId)) {
      throw this._buildError("Delivery not assigned to courier", 404, "NOT_ASSIGNED");
    }

    const updatedDelivery = this.assignmentBridge.removeAssignment(deliveryId, { actor });
    const activeDeliveries = courier.activeDeliveries.filter((id) => id !== deliveryId);
    const currentActiveDeliveries = Math.max(0, courier.capacity.currentActiveDeliveries - 1);
    const nextAvailability = this._syncAvailability({
      ...courier,
      status: "ACTIVE",
      capacity: { ...courier.capacity, currentActiveDeliveries },
      availability: courier.availability === "OFFLINE" ? "OFFLINE" : "AVAILABLE",
    });

    const updatedCourier = this.repository.update(courierId, {
      activeDeliveries,
      capacity: {
        ...courier.capacity,
        currentActiveDeliveries,
      },
      availability: nextAvailability,
    });

    this.history.record(courierId, {
      type: "assignment_removed",
      deliveryId,
      actor,
      note: `Assignment removed for delivery ${deliveryId}`,
    });

    return { courier: updatedCourier, delivery: updatedDelivery };
  }

  completeDelivery(courierId, deliveryId, { actor = "system" } = {}) {
    const courier = this.getCourier(courierId);
    if (!courier.activeDeliveries.includes(deliveryId)) {
      throw this._buildError("Delivery not assigned to courier", 404, "NOT_ASSIGNED");
    }

    const activeDeliveries = courier.activeDeliveries.filter((id) => id !== deliveryId);
    const currentActiveDeliveries = Math.max(0, courier.capacity.currentActiveDeliveries - 1);
    const nextAvailability = this._syncAvailability({
      ...courier,
      status: "ACTIVE",
      capacity: { ...courier.capacity, currentActiveDeliveries },
      availability: courier.availability === "OFFLINE" ? "OFFLINE" : "AVAILABLE",
    });

    const updatedCourier = this.repository.update(courierId, {
      activeDeliveries,
      completedDeliveries: courier.completedDeliveries + 1,
      capacity: {
        ...courier.capacity,
        currentActiveDeliveries,
      },
      availability: nextAvailability,
    });

    this.history.record(courierId, {
      type: "completed",
      deliveryId,
      actor,
      note: `Delivery ${deliveryId} completed`,
    });
    this.analytics.recordCompletedDelivery();
    this.analytics.recordCapacityUtilization(
      updatedCourier.capacity.currentActiveDeliveries,
      updatedCourier.capacity.maximumActiveDeliveries
    );

    return updatedCourier;
  }

  getCourierHistory(courierId) {
    this.getCourier(courierId);
    return this.history.getHistory(courierId);
  }

  getMetrics() {
    return this.analytics.getSummary();
  }
}

module.exports = CourierPlatform;
