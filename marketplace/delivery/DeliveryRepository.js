const crypto = require("crypto");

/**
 * In-memory delivery store — session-scoped foundation persistence.
 */
class DeliveryRepository {
  constructor() {
    this.deliveries = new Map();
    this.byTracking = new Map();
    this.byOrder = new Map();
  }

  create(record) {
    this.deliveries.set(record.deliveryId, record);
    this.byTracking.set(record.trackingNumber, record.deliveryId);
    this.byOrder.set(record.orderId, record.deliveryId);
    return this._clone(record);
  }

  findById(deliveryId) {
    const record = this.deliveries.get(deliveryId);
    return record ? this._clone(record) : null;
  }

  findByTrackingNumber(trackingNumber) {
    const deliveryId = this.byTracking.get(trackingNumber);
    return deliveryId ? this.findById(deliveryId) : null;
  }

  findByOrderId(orderId) {
    const deliveryId = this.byOrder.get(orderId);
    return deliveryId ? this.findById(deliveryId) : null;
  }

  update(deliveryId, patch) {
    const existing = this.deliveries.get(deliveryId);
    if (!existing) return null;

    const updated = {
      ...existing,
      ...patch,
      updatedAt: new Date().toISOString(),
    };

    this.deliveries.set(deliveryId, updated);
    return this._clone(updated);
  }

  list(filters = {}) {
    let items = [...this.deliveries.values()];

    if (filters.customerId) {
      items = items.filter((item) => String(item.customerId) === String(filters.customerId));
    }
    if (filters.vendorId) {
      items = items.filter((item) => String(item.vendorId) === String(filters.vendorId));
    }
    if (filters.courierId) {
      items = items.filter((item) => String(item.courierId) === String(filters.courierId));
    }
    if (filters.status) {
      items = items.filter((item) => item.status === filters.status);
    }
    if (filters.orderId) {
      items = items.filter((item) => String(item.orderId) === String(filters.orderId));
    }

    return items.map((item) => this._clone(item));
  }

  trackingExists(trackingNumber) {
    return this.byTracking.has(trackingNumber);
  }

  orderHasDelivery(orderId) {
    return this.byOrder.has(orderId);
  }

  generateDeliveryId() {
    return `dlv_${crypto.randomUUID()}`;
  }

  clear() {
    this.deliveries.clear();
    this.byTracking.clear();
    this.byOrder.clear();
  }

  _clone(record) {
    return JSON.parse(JSON.stringify(record));
  }
}

module.exports = DeliveryRepository;
