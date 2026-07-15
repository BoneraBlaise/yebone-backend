class RuleNotFoundError extends Error {
  constructor(strategy, context = {}) {
    super(`No commission rule found for strategy: ${strategy}`);
    this.name = "RuleNotFoundError";
    this.code = "RULE_NOT_FOUND";
    this.strategy = strategy;
    this.context = context;
  }
}

module.exports = RuleNotFoundError;
