const HealthCheck = require("./HealthCheck");

class StartupCheck extends HealthCheck {
  constructor({ name, evaluator }) {
    super({ name, type: "startup" });
    this.evaluator = evaluator;
  }

  async run() {
    const healthy = Boolean(await this.evaluator());
    return { name: this.name, type: this.type, healthy };
  }
}

module.exports = StartupCheck;
