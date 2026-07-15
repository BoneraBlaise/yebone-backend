class InvalidCommissionRuleError extends Error {
  constructor(message, details = {}) {
    super(message);
    this.name = "InvalidCommissionRuleError";
    this.code = "INVALID_COMMISSION_RULE";
    this.details = details;
  }
}

module.exports = InvalidCommissionRuleError;
