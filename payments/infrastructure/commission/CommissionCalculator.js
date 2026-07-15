const CommissionConfig = require("./CommissionConfig");
const CommissionBreakdown = require("./CommissionBreakdown");
const CommissionSnapshot = require("./CommissionSnapshot");
const CommissionCalculationError = require("./errors/CommissionCalculationError");

/**
 * Calculates commission amounts from resolved rules.
 * No hardcoded percentages — all rates come from rules.
 */
class CommissionCalculator {
  constructor({ config = CommissionConfig } = {}) {
    this.config = config;
  }

  calculate({ grossAmount, resolved, currency, metadata = {} }) {
    const amount = Number(grossAmount);
    if (!Number.isFinite(amount) || amount <= 0) {
      throw new CommissionCalculationError("grossAmount must be a positive number");
    }

    if (!resolved?.baseRule) {
      throw new CommissionCalculationError("Resolved base rule is required");
    }

    const platformCommission = this._applyRule(amount, resolved.baseRule);
    const referralCommission = (resolved.referralRules || []).reduce(
      (sum, rule) => sum + this._applyRule(amount, rule),
      0
    );
    const couponCommission = (resolved.couponRules || []).reduce(
      (sum, rule) => sum + this._applyRule(amount, rule),
      0
    );
    const tax = resolved.taxRule ? this._applyRule(amount, resolved.taxRule) : 0;

    const netSellerAmount = amount - platformCommission - referralCommission - couponCommission - tax;
    if (netSellerAmount < 0) {
      throw new CommissionCalculationError("Net seller amount cannot be negative", {
        grossAmount: amount,
        platformCommission,
        referralCommission,
        couponCommission,
        tax,
      });
    }

    const platformRevenue = platformCommission;
    const calculatedAt = new Date().toISOString();
    const ruleSnapshots = CommissionSnapshot.fromResolved(resolved, calculatedAt);

    return CommissionBreakdown.create({
      grossAmount: amount,
      platformCommission,
      referralCommission,
      couponCommission,
      tax,
      netSellerAmount,
      platformRevenue,
      currency,
      appliedRules: {
        base: resolved.baseRule.id,
        referral: (resolved.referralRules || []).map((rule) => rule.id),
        coupon: (resolved.couponRules || []).map((rule) => rule.id),
        tax: resolved.taxRule?.id || null,
      },
      ruleSnapshots,
      metadata,
      calculatedAt,
    });
  }

  _applyRule(baseAmount, rule) {
    if (rule.rateType === "FIXED") {
      return CommissionBreakdown._round(Math.min(rule.rate, baseAmount));
    }
    return CommissionBreakdown._round((baseAmount * rule.rate) / 100);
  }
}

module.exports = CommissionCalculator;
