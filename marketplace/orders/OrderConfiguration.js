/**
 * Orders platform configuration — frozen after orders-v1.
 */
class OrderConfiguration {
  constructor(options = {}) {
    this.name = options.name || "Yebone Orders Platform";
    this.version = options.version || "1.0.0";
    this.serviceChargeRate = Number(options.serviceChargeRate || 0.1);
    this.enableAnalytics = options.enableAnalytics !== false;
  }
}

module.exports = OrderConfiguration;
