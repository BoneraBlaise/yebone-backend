const CommissionConfig = require("./CommissionConfig");

class CommissionHealthContract {
  static build(engine) {
    const rules = engine.resolver?.count?.() ?? 0;
    const healthy = rules > 0;

    return Object.freeze({
      healthy,
      rules,
      version: engine.config?.version || CommissionConfig.version,
      strategies: CommissionConfig.strategies,
      checkedAt: new Date().toISOString(),
    });
  }
}

module.exports = CommissionHealthContract;
