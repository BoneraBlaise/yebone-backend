const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const { createCommissionEngine } = require("../index");
const CommissionCalculator = require("../CommissionCalculator");
const CommissionRuleResolver = require("../CommissionRuleResolver");

describe("CommissionRuleResolver", () => {
  it("resolves by priority: campaign over vendor over global", () => {
    const resolver = new CommissionRuleResolver();
    resolver.registerAll([
      { strategy: "GLOBAL", rate: 10 },
      { strategy: "VENDOR", rate: 12, scope: { vendorId: "v-1" } },
      { strategy: "CAMPAIGN", rate: 15, scope: { campaignId: "camp-1" } },
    ]);

    const resolved = resolver.resolve({ vendorId: "v-1", campaignId: "camp-1", grossAmount: 1000 });
    assert.equal(resolved.baseRule.strategy, "CAMPAIGN");
    assert.equal(resolved.baseRule.rate, 15);
  });

  it("resolves vendor over category over subscription over global", () => {
    const resolver = new CommissionRuleResolver();
    resolver.registerAll([
      { strategy: "GLOBAL", rate: 5 },
      { strategy: "SUBSCRIPTION", rate: 7, scope: { subscriptionTier: "pro" } },
      { strategy: "CATEGORY", rate: 9, scope: { categoryId: "electronics" } },
      { strategy: "VENDOR", rate: 11, scope: { vendorId: "v-2" } },
    ]);

    const resolved = resolver.resolve({
      vendorId: "v-2",
      categoryId: "electronics",
      subscriptionTier: "pro",
    });
    assert.equal(resolved.baseRule.strategy, "VENDOR");
  });

  it("resolves referral rules additively", () => {
    const resolver = new CommissionRuleResolver();
    resolver.registerAll([
      { strategy: "GLOBAL", rate: 10 },
      { strategy: "REFERRAL", rate: 2, scope: { referrerId: "ref-1" } },
      { strategy: "REFERRAL", rate: 1, scope: { referrerId: "ref-2" } },
    ]);

    const resolved = resolver.resolve({ referrerId: "ref-1" });
    assert.equal(resolved.referralRules.length, 1);
    assert.equal(resolved.referralRules[0].rate, 2);
  });
});

describe("CommissionCalculator", () => {
  it("returns immutable balanced breakdown", () => {
    const resolver = new CommissionRuleResolver();
    resolver.registerAll([
      { strategy: "GLOBAL", rate: 10 },
      { strategy: "REFERRAL", rate: 2, scope: { referrerId: "ref-1" } },
      { strategy: "GLOBAL", rate: 1, metadata: { type: "TAX" }, scope: { type: "TAX" } },
    ]);

    const calculator = new CommissionCalculator();
    const resolved = resolver.resolve({ referrerId: "ref-1" });
    const breakdown = calculator.calculate({
      grossAmount: 10000,
      resolved,
      currency: "UGX",
    });

    assert.equal(breakdown.grossAmount, 10000);
    assert.equal(breakdown.platformCommission, 1000);
    assert.equal(breakdown.referralCommission, 200);
    assert.equal(breakdown.tax, 100);
    assert.equal(breakdown.netSellerAmount, 8700);
    assert.equal(breakdown.platformRevenue, 1000);
    assert.equal(
      breakdown.netSellerAmount + breakdown.platformCommission + breakdown.referralCommission + breakdown.tax,
      10000
    );
    assert.equal(Object.isFrozen(breakdown), true);
  });
});
