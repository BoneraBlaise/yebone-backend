class PlatformObservabilityService {
  constructor() {
    this.metrics = {
      orderCreations: 0,
      paymentFailures: 0,
      paymentSuccesses: 0,
      deliveryCreations: 0,
      settlementEvents: 0,
      refundEvents: 0,
      repricingEvents: 0,
      auditEvents: 0,
    };
    this.events = [];
    this.maxEvents = 1000;
  }

  record(event, payload = {}) {
    const entry = {
      event,
      payload,
      timestamp: new Date().toISOString(),
      correlationId: payload.correlationId || null,
    };
    this.events.push(entry);
    if (this.events.length > this.maxEvents) {
      this.events.shift();
    }
    if (this.metrics[event] !== undefined) {
      this.metrics[event] += 1;
    }
    return entry;
  }

  increment(metric, amount = 1) {
    if (this.metrics[metric] !== undefined) {
      this.metrics[metric] += amount;
    }
  }

  getMetrics() {
    return { ...this.metrics, eventCount: this.events.length };
  }

  getHealth() {
    return {
      status: "ok",
      metrics: this.getMetrics(),
    };
  }
}

module.exports = PlatformObservabilityService;
