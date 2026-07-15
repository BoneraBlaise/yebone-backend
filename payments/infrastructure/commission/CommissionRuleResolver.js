const CommissionConfig = require("./CommissionConfig");
const CommissionRule = require("./CommissionRule");
const RuleNotFoundError = require("./errors/RuleNotFoundError");

/**
 * Resolves commission rules by priority.
 * Base: Manual Override > Flash Sale > Campaign > Product > Vendor > Category > Subscription > Global.
 * Referral and Coupon are additive.
 */
class CommissionRuleResolver {
  constructor({ rules = [], config = CommissionConfig } = {}) {
    this.rules = rules;
    this.config = config;
  }

  register(rule) {
    const normalized = CommissionRule.create(rule);
    this.rules.push(normalized);
    return normalized;
  }

  registerAll(rules = []) {
    return rules.map((rule) => this.register(rule));
  }

  resolve(context = {}) {
    const baseStrategies = this.config.strategies.filter(
      (strategy) => !this.config.additiveStrategies.includes(strategy)
    );

    const matchingBase = this.rules
      .filter((rule) => baseStrategies.includes(rule.strategy))
      .filter((rule) => !CommissionRule._isTaxRule(rule))
      .filter((rule) => CommissionRule.matches(rule, context))
      .sort(CommissionRuleResolver._compareRules);

    const baseRule = matchingBase[0] || null;

    const referralRules = this.rules
      .filter((rule) => rule.strategy === "REFERRAL")
      .filter((rule) => CommissionRule.matches(rule, context))
      .sort(CommissionRuleResolver._compareRules);

    const couponRules = this.rules
      .filter((rule) => rule.strategy === "COUPON")
      .filter((rule) => CommissionRule.matches(rule, context))
      .sort(CommissionRuleResolver._compareRules);

    const taxRule = this.rules.find(
      (rule) => CommissionRule._isTaxRule(rule) && rule.enabled
    ) || null;

    return Object.freeze({
      baseRule,
      referralRules: Object.freeze([...referralRules]),
      couponRules: Object.freeze([...couponRules]),
      taxRule,
      context: Object.freeze({ ...context }),
    });
  }

  requireBaseRule(context = {}) {
    const resolved = this.resolve(context);
    if (!resolved.baseRule) {
      throw new RuleNotFoundError("BASE", context);
    }
    return resolved;
  }

  list() {
    return [...this.rules];
  }

  count() {
    return this.rules.length;
  }

  static _compareRules(a, b) {
    if (a.priority !== b.priority) {
      return a.priority - b.priority;
    }
    if (a.createdAt !== b.createdAt) {
      return a.createdAt.localeCompare(b.createdAt);
    }
    return a.id.localeCompare(b.id);
  }
}

module.exports = CommissionRuleResolver;
