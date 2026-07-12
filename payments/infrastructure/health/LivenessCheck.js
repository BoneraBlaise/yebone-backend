const HealthCheck = require("./HealthCheck");

class LivenessCheck extends HealthCheck {
  constructor({ name, evaluator = () => true }) {
    super({ name, type: "liveness" });
    this.evaluator = evaluator;
  }

  async run() {
    const healthy = Boolean(await this.evaluator());
    return { name: this.name, type: this.type, healthy };
  }
}

module.exports = LivenessCheck;
