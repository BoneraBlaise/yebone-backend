const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const { createLedgerFoundation, LedgerHealthContract } = require("../index");

describe("LedgerHealthContract", () => {
  it("returns required fields", () => {
    const { engine } = createLedgerFoundation();
    const health = LedgerHealthContract.build(engine);
    assert.equal(typeof health.healthy, "boolean");
    assert.equal(typeof health.accounts, "number");
    assert.equal(typeof health.journals, "number");
    assert.equal(typeof health.entries, "number");
    assert.equal(typeof health.balanced, "boolean");
    assert.ok(health.version);
    assert.ok(health.checkedAt);
  });

  it("matches engine.health()", () => {
    const { engine } = createLedgerFoundation();
    const direct = LedgerHealthContract.build(engine);
    const delegated = engine.health();
    assert.deepEqual(
      { healthy: direct.healthy, accounts: direct.accounts, balanced: direct.balanced },
      { healthy: delegated.healthy, accounts: delegated.accounts, balanced: delegated.balanced }
    );
  });
});
