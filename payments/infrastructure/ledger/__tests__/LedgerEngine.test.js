const { describe, it, beforeEach } = require("node:test");
const assert = require("node:assert/strict");
const { createLedgerFoundation } = require("../index");
const LedgerHealthContract = require("../LedgerHealthContract");

describe("LedgerEngine", () => {
  let foundation;

  beforeEach(() => {
    foundation = createLedgerFoundation();
  });

  it("posts escrow release flow", () => {
    const cash = foundation.chartOfAccounts.getByCode("CASH");
    const escrow = foundation.chartOfAccounts.getByCode("MARKETPLACE_ESCROW");
    const vendor = foundation.chartOfAccounts.getByCode("VENDOR_PAYABLE");
    const revenue = foundation.chartOfAccounts.getByCode("PLATFORM_REVENUE");

    foundation.engine.post({
      journalId: "buyer-pay",
      description: "Buyer payment",
      entries: [
        { accountId: cash.id, debit: 10000, credit: 0 },
        { accountId: escrow.id, debit: 0, credit: 10000 },
      ],
    });

    foundation.engine.post({
      journalId: "escrow-release",
      description: "Escrow release",
      entries: [
        { accountId: escrow.id, debit: 10000, credit: 0 },
        { accountId: vendor.id, debit: 0, credit: 8500 },
        { accountId: revenue.id, debit: 0, credit: 1500 },
      ],
    });

    const trial = foundation.engine.trialBalance();
    assert.equal(trial.balanced, true);
    assert.equal(foundation.engine.accountBalanceByCode("MARKETPLACE_ESCROW"), 0);
    assert.equal(foundation.engine.accountBalanceByCode("VENDOR_PAYABLE"), 8500);
    assert.equal(foundation.engine.accountBalanceByCode("PLATFORM_REVENUE"), 1500);
  });

  it("exposes health contract", () => {
    const health = foundation.engine.health();
    assert.equal(health.healthy, true);
    assert.equal(health.accounts, 25);
    assert.equal(health.balanced, true);
    assert.match(health.version, /^6\.0\.0-/);
  });

  it("health contract detects imbalance", () => {
    const report = LedgerHealthContract.build({
      chartOfAccounts: foundation.chartOfAccounts,
      store: {
        entries: [
          { journalId: "x", debit: 100, credit: 0 },
          { journalId: "x", debit: 0, credit: 50 },
        ],
      },
      config: foundation.config,
    });
    assert.equal(report.balanced, false);
    assert.equal(report.healthy, false);
  });
});
