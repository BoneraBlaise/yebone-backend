const HealthCheck = require("./HealthCheck");

class DependencyCheck extends HealthCheck {
  constructor({ name, dependencyName, evaluator }) {
    super({ name, type: "dependency" });
    this.dependencyName = dependencyName;
    this.evaluator = evaluator;
  }

  async run() {
    const healthy = Boolean(await this.evaluator());
    return { name: this.name, type: this.type, dependency: this.dependencyName, healthy };
  }
}

module.exports = DependencyCheck;
