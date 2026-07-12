/**
 * Registry for infrastructure health checks.
 */
class HealthCheckRegistry {
  constructor() {
    this.checks = new Map();
  }

  register(check) {
    this.checks.set(check.name, check);
    return this;
  }

  async runAll() {
    const results = [];
    for (const check of this.checks.values()) {
      results.push(await check.run());
    }
    const healthy = results.every((r) => r.healthy);
    return { healthy, results, checkedAt: new Date().toISOString() };
  }

  async runByType(type) {
    const results = [];
    for (const check of this.checks.values()) {
      if (check.type === type) {
        results.push(await check.run());
      }
    }
    const healthy = results.every((r) => r.healthy);
    return { healthy, type, results, checkedAt: new Date().toISOString() };
  }
}

module.exports = HealthCheckRegistry;
