/**
 * Health check contract.
 */
class HealthCheck {
  constructor({ name, type }) {
    this.name = name;
    this.type = type;
  }

  async run() {
    throw new Error("HealthCheck.run must be implemented");
  }
}

module.exports = HealthCheck;
