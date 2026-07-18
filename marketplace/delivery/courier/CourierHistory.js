const crypto = require("crypto");

/**
 * Immutable courier history store.
 */
class CourierHistory {
  constructor() {
    this.events = new Map();
  }

  record(courierId, event) {
    const list = this.events.get(courierId) || [];
    const entry = Object.freeze({
      eventId: event.eventId || `crr_evt_${crypto.randomUUID()}`,
      courierId,
      type: event.type,
      timestamp: event.timestamp || new Date().toISOString(),
      actor: event.actor || "system",
      deliveryId: event.deliveryId || null,
      status: event.status || null,
      availability: event.availability || null,
      note: event.note || null,
    });

    list.push(entry);
    this.events.set(courierId, list);
    return entry;
  }

  getHistory(courierId) {
    return [...(this.events.get(courierId) || [])];
  }

  clear() {
    this.events.clear();
  }
}

module.exports = CourierHistory;
