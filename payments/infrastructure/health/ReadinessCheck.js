const HealthCheck = require("./HealthCheck");

class ReadinessCheck extends HealthCheck {
  constructor({ name, evaluator }) {
    super({ name, type: "readiness" });
    this.evaluator = evaluator;
  }

  async run() {
    const healthy = Boolean(await this.evaluator());
    return { name: this.name, type: this.type, healthy };
  }
}

module.exports = ReadinessCheck;
