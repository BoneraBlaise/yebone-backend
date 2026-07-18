/**
 * Courier platform configuration.
 */
class CourierConfiguration {
  constructor(config = {}) {
    this.name = config.name || "Yebone Courier Management";
    this.version = config.version || "8.2.0";
    this.phase = config.phase || "8.2";
    this.defaultMaxActiveDeliveries = config.defaultMaxActiveDeliveries || 5;
    this.enableAnalytics = config.enableAnalytics !== false;
  }
}

module.exports = CourierConfiguration;
