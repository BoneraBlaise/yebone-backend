const ApplicationMetrics = require("./ApplicationMetrics");
const PaymentMetrics = require("./PaymentMetrics");
const HealthMetrics = require("./HealthMetrics");

/**
 * Monitoring service facade.
 */
class MonitoringService {
  constructor({ collector }) {
    this.collector = collector;
    this.application = new ApplicationMetrics({ collector });
    this.payment = new PaymentMetrics({ collector });
    this.health = new HealthMetrics({ collector });
  }

  snapshot() {
    return this.collector.snapshot();
  }
}

module.exports = MonitoringService;
