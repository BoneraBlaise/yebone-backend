const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const CommissionSnapshot = require("../CommissionSnapshot");
const CommissionCalculator = require("../CommissionCalculator");
const CommissionRuleResolver = require("../CommissionRuleResolver");

describe("CommissionSnapshot", () => {
  it("creates immutable snapshot from rule", () => {
    const snapshot = CommissionSnapshot.fromRule(
      {
        id: "rule-1",
        strategy: "VENDOR",
        rate: 12,
        rateType: "PERCENTAGE",
        metadata: { version: "2.1" },
      },
      "2026-07-15T12:00:00.000Z"
    );

    assert.equal(snapshot.ruleId, "rule-1");
    assert.equal(snapshot.ruleVersion, "2.1");
    assert.equal(snapshot.ruleType, "VENDOR");
    assert.equal(snapshot.rate, 12);
    assert.equal(snapshot.calculatedAt, "2026-07-15T12:00:00.000Z");
    assert.equal(Object.isFrozen(snapshot), true);
  });

  it("builds snapshots for all resolved rules", () => {
    const resolver = new CommissionRuleResolver();
    resolver.registerAll([
      { id: "base", strategy: "GLOBAL", rate: 10 },
      { id: "ref", strategy: "REFERRAL", rate: 2, scope: { referrerId: "r1" } },
      { id: "tax", strategy: "GLOBAL", rate: 1, metadata: { type: "TAX" }, scope: { type: "TAX" } },
    ]);

    const resolved = resolver.resolve({ referrerId: "r1" });
    const snapshots = CommissionSnapshot.fromResolved(resolved, "2026-07-15T12:00:00.000Z");

    assert.equal(snapshots.length, 3);
    assert.equal(snapshots[0].ruleType, "GLOBAL");
    assert.equal(snapshots[1].ruleType, "REFERRAL");
    assert.equal(snapshots[2].ruleType, "TAX");
    assert.equal(Object.isFrozen(snapshots), true);
  });

  it("is stored on every calculated breakdown", () => {
    const resolver = new CommissionRuleResolver();
    resolver.register({ strategy: "GLOBAL", rate: 10, metadata: { version: "3.0" } });
    const calculator = new CommissionCalculator();
    const resolved = resolver.requireBaseRule({});
    const breakdown = calculator.calculate({ grossAmount: 1000, resolved });

    assert.equal(breakdown.ruleSnapshots.length, 1);
    assert.equal(breakdown.ruleSnapshots[0].ruleVersion, "3.0");
    assert.equal(breakdown.ruleSnapshots[0].rate, 10);
    assert.equal(Object.isFrozen(breakdown.ruleSnapshots), true);
  });
});
