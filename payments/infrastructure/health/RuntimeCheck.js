const HealthCheck = require("./HealthCheck");

class RuntimeCheck extends HealthCheck {
  constructor({ name, evaluator }) {
    super({ name, type: "runtime" });
    this.evaluator = evaluator;
  }

  async run() {
    const healthy = Boolean(await this.evaluator());
    return { name: this.name, type: this.type, healthy };
  }
}

module.exports = RuntimeCheck;
