const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const CommissionRuleResolver = require("../CommissionRuleResolver");
const RuleNotFoundError = require("../errors/RuleNotFoundError");

describe("CommissionRuleResolver", () => {
  it("resolves campaign before vendor before global", () => {
    const resolver = new CommissionRuleResolver();
    resolver.registerAll([
      { strategy: "GLOBAL", rate: 10 },
      { strategy: "VENDOR", rate: 12, scope: { vendorId: "v-1" } },
      { strategy: "CAMPAIGN", rate: 15, scope: { campaignId: "c-1" } },
    ]);
    const { baseRule } = resolver.resolve({ vendorId: "v-1", campaignId: "c-1" });
    assert.equal(baseRule.strategy, "CAMPAIGN");
  });

  it("throws when no base rule exists", () => {
    const resolver = new CommissionRuleResolver();
    assert.throws(() => resolver.requireBaseRule({}), RuleNotFoundError);
  });
});
