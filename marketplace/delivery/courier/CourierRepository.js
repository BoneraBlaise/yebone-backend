const crypto = require("crypto");

/**
 * In-memory courier store.
 */
class CourierRepository {
  constructor() {
    this.couriers = new Map();
    this.byPhone = new Map();
  }

  create(record) {
    this.couriers.set(record.courierId, record);
    this.byPhone.set(record.phoneNumber, record.courierId);
    return this._clone(record);
  }

  findById(courierId) {
    const record = this.couriers.get(courierId);
    return record ? this._clone(record) : null;
  }

  update(courierId, patch) {
    const existing = this.couriers.get(courierId);
    if (!existing) return null;

    if (patch.phoneNumber && patch.phoneNumber !== existing.phoneNumber) {
      this.byPhone.delete(existing.phoneNumber);
      this.byPhone.set(patch.phoneNumber, courierId);
    }

    const updated = {
      ...existing,
      ...patch,
      updatedAt: new Date().toISOString(),
    };

    this.couriers.set(courierId, updated);
    return this._clone(updated);
  }

  list(filters = {}) {
    let items = [...this.couriers.values()];

    if (filters.status) {
      items = items.filter((item) => item.status === filters.status);
    }
    if (filters.availability) {
      items = items.filter((item) => item.availability === filters.availability);
    }

    return items.map((item) => this._clone(item));
  }

  phoneExists(phoneNumber, excludeCourierId = null) {
    const courierId = this.byPhone.get(phoneNumber);
    if (!courierId) return false;
    return excludeCourierId ? courierId !== excludeCourierId : true;
  }

  generateCourierId() {
    return `crr_${crypto.randomUUID()}`;
  }

  clear() {
    this.couriers.clear();
    this.byPhone.clear();
  }

  _clone(record) {
    return JSON.parse(JSON.stringify(record));
  }
}

module.exports = CourierRepository;
