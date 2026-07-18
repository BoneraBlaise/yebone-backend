const DeliveryTrackingTimeline = require("./DeliveryTrackingTimeline");

const STATUS_LABELS = Object.freeze({
  PENDING: "Delivery Created",
  CONFIRMED: "Confirmed",
  ASSIGNED: "Courier Assigned",
  PICKED_UP: "Package Picked Up",
  IN_TRANSIT: "In Transit",
  DELIVERED: "Delivered",
  FAILED: "Delivery Failed",
  CANCELLED: "Delivery Cancelled",
});

/**
 * Delivery tracking service — timeline visibility without live GPS.
 */
class TrackingService {
  constructor({ timeline, analytics } = {}) {
    this.timeline = timeline || new DeliveryTrackingTimeline();
    this.analytics = analytics || null;
  }

  static labelForStatus(status) {
    return STATUS_LABELS[status] || status;
  }

  recordEvent(deliveryId, { status, actor = "system", note = null, timestamp = null } = {}) {
    if (!deliveryId || !status) {
      throw new Error("Tracking event requires deliveryId and status");
    }

    const event = this.timeline.append(deliveryId, {
      status,
      actor,
      note: note || TrackingService.labelForStatus(status),
      timestamp,
    });

    if (this.analytics) {
      this.analytics.recordTimelineEvent(this.timeline.getEventCount(deliveryId));
    }

    return event;
  }

  getTimeline(deliveryId) {
    const started = Date.now();
    const events = this.timeline.getTimeline(deliveryId);
    if (this.analytics) {
      this.analytics.recordTimelineRetrieval(Date.now() - started, events.length);
    }
    return events;
  }

  getLatestEvent(deliveryId) {
    return this.timeline.getLatestEvent(deliveryId);
  }

  getCurrentStatus(deliveryId) {
    const latest = this.getLatestEvent(deliveryId);
    return latest
      ? {
          deliveryId,
          status: latest.status,
          timestamp: latest.timestamp,
          actor: latest.actor,
          note: latest.note,
        }
      : null;
  }

  getTrackingHistory(deliveryId) {
    return this.getTimeline(deliveryId);
  }

  recordLookup() {
    if (this.analytics) {
      this.analytics.recordTrackingLookup();
    }
  }
}

module.exports = TrackingService;
