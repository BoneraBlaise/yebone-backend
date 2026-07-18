/**
 * Tracking observability metrics (Phase 8.1).
 */
class DeliveryTrackingAnalytics {
  constructor() {
    this.metrics = {
      trackingLookups: 0,
      timelineEvents: 0,
      timelineHistoryLengths: [],
      progressionDurationsMs: [],
      timelineRetrievalLatenciesMs: [],
    };
  }

  recordTrackingLookup() {
    this.metrics.trackingLookups += 1;
  }

  recordTimelineEvent(historyLength) {
    this.metrics.timelineEvents += 1;
    if (Number.isFinite(historyLength)) {
      this.metrics.timelineHistoryLengths.push(historyLength);
    }
  }

  recordProgressionDuration(ms) {
    if (!Number.isFinite(ms) || ms < 0) return;
    this.metrics.progressionDurationsMs.push(ms);
  }

  recordTimelineRetrieval(latencyMs, historyLength) {
    if (Number.isFinite(latencyMs) && latencyMs >= 0) {
      this.metrics.timelineRetrievalLatenciesMs.push(latencyMs);
    }
    if (Number.isFinite(historyLength)) {
      this.metrics.timelineHistoryLengths.push(historyLength);
    }
  }

  getSummary() {
    const avg = (values) =>
      values.length ? Math.round(values.reduce((sum, v) => sum + v, 0) / values.length) : 0;

    return Object.freeze({
      trackingLookups: this.metrics.trackingLookups,
      timelineEvents: this.metrics.timelineEvents,
      averageStatusHistoryLength: avg(this.metrics.timelineHistoryLengths),
      averageDeliveryProgressionMs: avg(this.metrics.progressionDurationsMs),
      averageTimelineRetrievalLatencyMs: avg(this.metrics.timelineRetrievalLatenciesMs),
    });
  }

  reset() {
    this.metrics = {
      trackingLookups: 0,
      timelineEvents: 0,
      timelineHistoryLengths: [],
      progressionDurationsMs: [],
      timelineRetrievalLatenciesMs: [],
    };
  }
}

module.exports = DeliveryTrackingAnalytics;
