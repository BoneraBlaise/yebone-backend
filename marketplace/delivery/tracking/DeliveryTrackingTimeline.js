const crypto = require("crypto");

/**
 * Append-only delivery tracking timeline store.
 */
class DeliveryTrackingTimeline {
  constructor() {
    this.events = new Map();
  }

  append(deliveryId, event) {
    const list = this.events.get(deliveryId) || [];
    const entry = Object.freeze({
      eventId: event.eventId || `evt_${crypto.randomUUID()}`,
      deliveryId,
      status: event.status,
      timestamp: event.timestamp || new Date().toISOString(),
      actor: event.actor || "system",
      note: event.note || null,
    });

    list.push(entry);
    this.events.set(deliveryId, list);
    return entry;
  }

  getTimeline(deliveryId) {
    return [...(this.events.get(deliveryId) || [])];
  }

  getLatestEvent(deliveryId) {
    const timeline = this.events.get(deliveryId) || [];
    return timeline.length ? timeline[timeline.length - 1] : null;
  }

  getEventCount(deliveryId) {
    return (this.events.get(deliveryId) || []).length;
  }

  clear() {
    this.events.clear();
  }
}

module.exports = DeliveryTrackingTimeline;
