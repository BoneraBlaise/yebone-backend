const { randomUUID } = require("crypto");
const CommissionConfig = require("./CommissionConfig");
const InvalidCommissionRuleError = require("./errors/InvalidCommissionRuleError");

/**
 * Configurable commission rule — no hardcoded percentages.
 */
class CommissionRule {
  static create(input = {}) {
    const rule = {
      id: input.id || randomUUID(),
      strategy: input.strategy,
      rate: Number(input.rate),
      rateType: input.rateType || "PERCENTAGE",
      priority: input.priority ?? CommissionConfig.resolutionPriority[input.strategy] ?? 99,
      enabled: input.enabled !== false,
      scope: input.scope && typeof input.scope === "object" ? { ...input.scope } : {},
      metadata: input.metadata && typeof input.metadata === "object" ? { ...input.metadata } : {},
      createdAt: input.createdAt || new Date().toISOString(),
    };

    CommissionRule.validate(rule);
    return Object.freeze(rule);
  }

  static validate(rule) {
    if (!rule || typeof rule !== "object") {
      throw new InvalidCommissionRuleError("Rule must be an object");
    }

    if (!CommissionConfig.strategies.includes(rule.strategy)) {
      throw new InvalidCommissionRuleError(`Invalid strategy: ${rule.strategy}`);
    }

    if (CommissionRule._isTaxRule(rule) && rule.strategy !== "GLOBAL") {
      throw new InvalidCommissionRuleError("Tax rules must use GLOBAL strategy with type TAX scope/metadata");
    }

    if (!Number.isFinite(rule.rate) || rule.rate < 0) {
      throw new InvalidCommissionRuleError("Rate must be a non-negative number");
    }

    if (rule.rateType === "PERCENTAGE" && rule.rate > 100) {
      throw new InvalidCommissionRuleError("Percentage rate cannot exceed 100");
    }

    if (!CommissionConfig.rateTypes.includes(rule.rateType)) {
      throw new InvalidCommissionRuleError(`Invalid rateType: ${rule.rateType}`);
    }

    return true;
  }

  static matches(rule, context = {}) {
    if (!rule.enabled) {
      return false;
    }

    switch (rule.strategy) {
      case "GLOBAL":
        return !CommissionRule._isTaxRule(rule);
      case "VENDOR":
        return rule.scope.vendorId === context.vendorId;
      case "CATEGORY":
        return rule.scope.categoryId === context.categoryId;
      case "CAMPAIGN":
        return rule.scope.campaignId === context.campaignId;
      case "SUBSCRIPTION":
        return rule.scope.subscriptionTier === context.subscriptionTier;
      case "PRODUCT":
        return rule.scope.productId === context.productId;
      case "FLASH_SALE":
        return rule.scope.flashSaleId === context.flashSaleId;
      case "MANUAL_OVERRIDE":
        return rule.scope.orderId === context.orderId
          || rule.scope.overrideId === context.overrideId;
      case "REFERRAL":
        return CommissionRule._matchesReferral(rule, context);
      case "COUPON":
        return CommissionRule._matchesCoupon(rule, context);
      default:
        return false;
    }
  }

  static _isTaxRule(rule) {
    return rule.metadata?.type === "TAX" || rule.scope?.type === "TAX";
  }

  static _matchesReferral(rule, context) {
    if (!context.referrerId) {
      return false;
    }
    if (rule.scope.referrerId && rule.scope.referrerId !== context.referrerId) {
      return false;
    }
    if (rule.scope.level !== undefined && rule.scope.level !== context.referralLevel) {
      return false;
    }
    return true;
  }

  static _matchesCoupon(rule, context) {
    if (!context.couponId) {
      return false;
    }
    return !rule.scope.couponId || rule.scope.couponId === context.couponId;
  }
}

module.exports = CommissionRule;
