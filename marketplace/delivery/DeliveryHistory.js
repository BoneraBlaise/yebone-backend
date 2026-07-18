/**
 * Delivery status history tracking.
 */
class DeliveryHistory {
  constructor({ repository } = {}) {
    this.repository = repository;
    this.events = new Map();
  }

  record(deliveryId, event) {
    const list = this.events.get(deliveryId) || [];
    const entry = {
      id: `hist_${list.length + 1}`,
      deliveryId,
      timestamp: new Date().toISOString(),
      ...event,
    };
    list.push(entry);
    this.events.set(deliveryId, list);
    return entry;
  }

  getHistory(deliveryId) {
    return [...(this.events.get(deliveryId) || [])];
  }

  clear() {
    this.events.clear();
  }
}

module.exports = DeliveryHistory;
