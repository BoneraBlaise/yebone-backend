const { createCommissionEngine } = require("../../payments/infrastructure/commission");
const CommissionConfig = require("../../payments/infrastructure/commission/CommissionConfig");

class CommissionRuleSimulatorService {
  constructor({ ruleAdmin, analytics } = {}) {
    if (!ruleAdmin) throw new Error("CommissionRuleSimulatorService requires ruleAdmin");
    this.ruleAdmin = ruleAdmin;
    this.analytics = analytics;
  }

  _toEngineRule(rule) {
    return {
      id: rule.id,
      strategy: rule.strategy,
      rate: rule.rate,
      rateType: rule.rateType,
      priority: rule.priority,
      enabled: rule.enabled,
      scope: rule.scope || {},
      metadata: {
        name: rule.name,
        startDate: rule.startDate,
        endDate: rule.endDate,
        archived: rule.archived,
      },
      startDate: rule.startDate,
      endDate: rule.endDate,
      createdAt: rule.createdAt,
    };
  }

  simulate(input = {}) {
    const price = Number(input.price || input.grossAmount || 0);
    if (!Number.isFinite(price) || price <= 0) {
      return { valid: false, reason: "PRICE_REQUIRED" };
    }

    const context = {
      grossAmount: price,
      vendorId: input.vendorId ? String(input.vendorId) : null,
      categoryId: input.categoryId ? String(input.categoryId) : null,
      brandId: input.brandId ? String(input.brandId) : null,
      productId: input.productId ? String(input.productId) : null,
      referrerId: input.referrerId || input.referralCode || null,
      campaignId: input.campaignId ? String(input.campaignId) : null,
      couponId: input.couponId ? String(input.couponId) : null,
    };

    const rules = this.ruleAdmin.getActiveRulesForEngine().map((rule) => this._toEngineRule(rule));
    const { engine } = createCommissionEngine({ rules });

    let resolved;
    let breakdown;
    try {
      resolved = engine.resolve(context);
      breakdown = engine.calculate({ grossAmount: price, resolved, currency: "RWF" });
    } catch (error) {
      return { valid: false, reason: error.message || "SIMULATION_FAILED" };
    }

    if (this.analytics) this.analytics.recordSimulatorExecution();

    const winningBaseRule = resolved.baseRule;
    const referralRules = resolved.referralRules || [];
    const conflicts = this._detectConflicts(resolved, rules);

    return {
      valid: true,
      context,
      winningRule: winningBaseRule
        ? {
            id: winningBaseRule.id,
            name: winningBaseRule.metadata?.name || winningBaseRule.id,
            strategy: winningBaseRule.strategy,
            rate: winningBaseRule.rate,
            rateType: winningBaseRule.rateType,
            priority: winningBaseRule.priority,
          }
        : null,
      appliedPercentage:
        winningBaseRule?.rateType === "PERCENTAGE" ? winningBaseRule.rate : null,
      referralRules: referralRules.map((rule) => ({
        id: rule.id,
        strategy: rule.strategy,
        rate: rule.rate,
        priority: rule.priority,
      })),
      priority: winningBaseRule?.priority ?? null,
      reason: winningBaseRule
        ? `Matched ${winningBaseRule.strategy} rule with priority ${winningBaseRule.priority}`
        : "No base rule matched",
      calculation: {
        grossAmount: breakdown.grossAmount,
        platformCommission: breakdown.platformCommission,
        referralCommission: breakdown.referralCommission,
        couponCommission: breakdown.couponCommission,
        netSellerAmount: breakdown.netSellerAmount,
      },
      conflictResolution: conflicts,
      priorityOrder: Object.entries(CommissionConfig.resolutionPriority)
        .sort((a, b) => a[1] - b[1])
        .map(([strategy, priority]) => ({ strategy, defaultPriority: priority })),
    };
  }

  _detectConflicts(resolved, allRules) {
    const baseMatches = allRules.filter(
      (rule) =>
        !["REFERRAL", "COUPON"].includes(rule.strategy) &&
        rule.enabled &&
        !rule.archived
    );

    if (!resolved.baseRule) {
      return { hasConflict: false, candidates: baseMatches.map((r) => r.id) };
    }

    const candidates = baseMatches
      .filter((rule) => rule.strategy === resolved.baseRule.strategy)
      .map((rule) => ({ id: rule.id, name: rule.name, priority: rule.priority }));

    return {
      hasConflict: candidates.length > 1,
      winner: resolved.baseRule.id,
      candidates,
    };
  }
}

module.exports = CommissionRuleSimulatorService;
