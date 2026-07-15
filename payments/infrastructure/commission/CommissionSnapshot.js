const CommissionConfig = require("./CommissionConfig");
const InvalidCommissionRuleError = require("./errors/InvalidCommissionRuleError");

/**
 * Immutable audit record of a commission rule applied at calculation time.
 */
class CommissionSnapshot {
  static create(input = {}) {
    const snapshot = {
      ruleId: input.ruleId,
      ruleVersion: input.ruleVersion || "1.0",
      ruleType: input.ruleType,
      rate: Number(input.rate),
      rateType: input.rateType || "PERCENTAGE",
      calculatedAt: input.calculatedAt || new Date().toISOString(),
    };

    CommissionSnapshot.validate(snapshot);
    return Object.freeze(snapshot);
  }

  static fromRule(rule, calculatedAt, overrides = {}) {
    if (!rule) {
      throw new InvalidCommissionRuleError("Rule is required for commission snapshot");
    }

    return CommissionSnapshot.create({
      ruleId: rule.id,
      ruleVersion: rule.metadata?.version || rule.metadata?.ruleVersion || "1.0",
      ruleType: overrides.ruleType || rule.strategy,
      rate: rule.rate,
      rateType: rule.rateType,
      calculatedAt,
    });
  }

  static fromResolved(resolved, calculatedAt) {
    const snapshots = [];

    if (resolved.baseRule) {
      snapshots.push(CommissionSnapshot.fromRule(resolved.baseRule, calculatedAt));
    }

    for (const rule of resolved.referralRules || []) {
      snapshots.push(CommissionSnapshot.fromRule(rule, calculatedAt));
    }

    for (const rule of resolved.couponRules || []) {
      snapshots.push(CommissionSnapshot.fromRule(rule, calculatedAt));
    }

    if (resolved.taxRule) {
      snapshots.push(CommissionSnapshot.fromRule(resolved.taxRule, calculatedAt, { ruleType: "TAX" }));
    }

    return Object.freeze(snapshots.map((snapshot) => Object.freeze({ ...snapshot })));
  }

  static validate(snapshot) {
    if (!snapshot || typeof snapshot !== "object") {
      throw new InvalidCommissionRuleError("Commission snapshot must be an object");
    }

    if (!snapshot.ruleId) {
      throw new InvalidCommissionRuleError("Commission snapshot ruleId is required");
    }

    if (!snapshot.ruleType) {
      throw new InvalidCommissionRuleError("Commission snapshot ruleType is required");
    }

    if (!Number.isFinite(snapshot.rate) || snapshot.rate < 0) {
      throw new InvalidCommissionRuleError("Commission snapshot rate must be non-negative");
    }

    if (!snapshot.calculatedAt) {
      throw new InvalidCommissionRuleError("Commission snapshot calculatedAt is required");
    }

    return true;
  }
}

module.exports = CommissionSnapshot;
