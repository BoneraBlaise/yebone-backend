const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const CommissionCalculator = require("../CommissionCalculator");
const CommissionRuleResolver = require("../CommissionRuleResolver");
const CommissionRule = require("../CommissionRule");
const InvalidCommissionRuleError = require("../errors/InvalidCommissionRuleError");
const CommissionCalculationError = require("../errors/CommissionCalculationError");
const RuleNotFoundError = require("../errors/RuleNotFoundError");

describe("Commission edge cases", () => {
  it("supports zero commission rate", () => {
    const resolver = new CommissionRuleResolver();
    resolver.register({ strategy: "GLOBAL", rate: 0 });
    const calculator = new CommissionCalculator();
    const resolved = resolver.requireBaseRule({});
    const breakdown = calculator.calculate({ grossAmount: 5000, resolved });
    assert.equal(breakdown.platformCommission, 0);
    assert.equal(breakdown.netSellerAmount, 5000);
  });

  it("supports 100 percent commission with zero net seller", () => {
    const resolver = new CommissionRuleResolver();
    resolver.register({ strategy: "GLOBAL", rate: 100 });
    const calculator = new CommissionCalculator();
    const resolved = resolver.requireBaseRule({});
    const breakdown = calculator.calculate({ grossAmount: 1000, resolved });
    assert.equal(breakdown.platformCommission, 1000);
    assert.equal(breakdown.netSellerAmount, 0);
  });

  it("rejects negative rates at rule creation", () => {
    assert.throws(
      () => CommissionRule.create({ strategy: "GLOBAL", rate: -5 }),
      InvalidCommissionRuleError
    );
  });

  it("rejects commission totals exceeding gross", () => {
    const resolver = new CommissionRuleResolver();
    resolver.register({ strategy: "GLOBAL", rate: 90 });
    resolver.register({ strategy: "REFERRAL", rate: 15, scope: { referrerId: "r1" } });
    const calculator = new CommissionCalculator();
    const resolved = resolver.resolve({ referrerId: "r1" });
    assert.throws(
      () => calculator.calculate({ grossAmount: 1000, resolved }),
      CommissionCalculationError
    );
  });

  it("throws when no base rule exists", () => {
    const resolver = new CommissionRuleResolver();
    assert.throws(() => resolver.requireBaseRule({}), RuleNotFoundError);
  });

  it("resolves multiple referral levels additively", () => {
    const resolver = new CommissionRuleResolver();
    resolver.register({ strategy: "GLOBAL", rate: 10 });
    resolver.register({ strategy: "REFERRAL", rate: 2, scope: { level: 1, referrerId: "l1" } });
    resolver.register({ strategy: "REFERRAL", rate: 1, scope: { level: 2, referrerId: "l2" } });
    const resolved = resolver.resolve({ referrerId: "l1", referralLevel: 1 });
    assert.equal(resolved.referralRules.length, 1);
    const resolvedL2 = resolver.resolve({ referrerId: "l2", referralLevel: 2 });
    assert.equal(resolvedL2.referralRules.length, 1);
  });

  it("resolves manual override over campaign", () => {
    const resolver = new CommissionRuleResolver();
    resolver.register({ strategy: "CAMPAIGN", rate: 15, scope: { campaignId: "c1" } });
    resolver.register({ strategy: "MANUAL_OVERRIDE", rate: 5, scope: { orderId: "o1" } });
    const resolved = resolver.resolve({ campaignId: "c1", orderId: "o1" });
    assert.equal(resolved.baseRule.strategy, "MANUAL_OVERRIDE");
  });

  it("resolves product and flash-sale strategies", () => {
    const resolver = new CommissionRuleResolver();
    resolver.register({ strategy: "GLOBAL", rate: 10 });
    resolver.register({ strategy: "PRODUCT", rate: 8, scope: { productId: "p1" } });
    resolver.register({ strategy: "FLASH_SALE", rate: 20, scope: { flashSaleId: "fs1" } });
    const product = resolver.resolve({ productId: "p1" });
    assert.equal(product.baseRule.strategy, "PRODUCT");
    const flash = resolver.resolve({ flashSaleId: "fs1", productId: "p1" });
    assert.equal(flash.baseRule.strategy, "FLASH_SALE");
  });

  it("resolves coupon commission additively", () => {
    const resolver = new CommissionRuleResolver();
    resolver.register({ strategy: "GLOBAL", rate: 10 });
    resolver.register({ strategy: "COUPON", rate: 3, scope: { couponId: "SAVE3" } });
    const calculator = new CommissionCalculator();
    const resolved = resolver.resolve({ couponId: "SAVE3" });
    const breakdown = calculator.calculate({ grossAmount: 10000, resolved });
    assert.equal(breakdown.couponCommission, 300);
    assert.equal(breakdown.netSellerAmount, 8700);
  });
});
