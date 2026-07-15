const CommissionConfig = require("./CommissionConfig");
const CommissionCalculationError = require("./errors/CommissionCalculationError");

/**
 * Immutable commission breakdown result.
 */
class CommissionBreakdown {
  static create(input = {}) {
    const breakdown = {
      grossAmount: CommissionBreakdown._round(input.grossAmount),
      platformCommission: CommissionBreakdown._round(input.platformCommission),
      referralCommission: CommissionBreakdown._round(input.referralCommission),
      couponCommission: CommissionBreakdown._round(input.couponCommission || 0),
      tax: CommissionBreakdown._round(input.tax),
      netSellerAmount: CommissionBreakdown._round(input.netSellerAmount),
      platformRevenue: CommissionBreakdown._round(input.platformRevenue),
      currency: input.currency || CommissionConfig.defaultCurrency,
      appliedRules: Object.freeze(input.appliedRules || {}),
      ruleSnapshots: Object.freeze(input.ruleSnapshots || []),
      metadata: Object.freeze(input.metadata && typeof input.metadata === "object" ? { ...input.metadata } : {}),
      calculatedAt: input.calculatedAt || new Date().toISOString(),
    };

    CommissionBreakdown.validate(breakdown);
    return Object.freeze(breakdown);
  }

  static validate(breakdown) {
    if (!breakdown || typeof breakdown !== "object") {
      throw new CommissionCalculationError("Breakdown must be an object");
    }

    const sum =
      breakdown.netSellerAmount
      + breakdown.platformCommission
      + breakdown.referralCommission
      + breakdown.couponCommission
      + breakdown.tax;

    const roundedSum = CommissionBreakdown._round(sum);
    if (roundedSum !== breakdown.grossAmount) {
      throw new CommissionCalculationError("Breakdown must reconcile to gross amount", {
        grossAmount: breakdown.grossAmount,
        sum: roundedSum,
      });
    }

    return true;
  }

  static _round(value) {
    return Number(Number(value || 0).toFixed(CommissionConfig.decimalPlaces));
  }
}

module.exports = CommissionBreakdown;
