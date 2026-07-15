class SettlementLifecycleError extends Error {
  constructor(message, details = {}) {
    super(message);
    this.name = "SettlementLifecycleError";
    this.code = "SETTLEMENT_LIFECYCLE_ERROR";
    this.details = details;
  }
}

module.exports = SettlementLifecycleError;
