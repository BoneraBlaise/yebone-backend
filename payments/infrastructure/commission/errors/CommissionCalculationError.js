class CommissionCalculationError extends Error {
  constructor(message, details = {}) {
    super(message);
    this.name = "CommissionCalculationError";
    this.code = "COMMISSION_CALCULATION_ERROR";
    this.details = details;
  }
}

module.exports = CommissionCalculationError;
