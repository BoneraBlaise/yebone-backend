/**
 * Delivery platform configuration.
 */
class DeliveryConfiguration {
  constructor(config = {}) {
    this.name = config.name || "Yebone Delivery";
    this.version = config.version || "8.0.0";
    this.phase = config.phase || "8.0";
    this.trackingPrefix = config.trackingPrefix || "YEB-DLV";
    this.enableAnalytics = config.enableAnalytics !== false;
  }
}

module.exports = DeliveryConfiguration;
