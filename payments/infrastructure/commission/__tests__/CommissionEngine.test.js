const { describe, it, beforeEach } = require("node:test");
const assert = require("node:assert/strict");
const { createCommissionEngine } = require("../index");
const { createLedgerFoundation } = require("../../ledger");

describe("CommissionEngine", () => {
  let commission;
  let ledger;

  beforeEach(() => {
    commission = createCommissionEngine({
      rules: [
        { strategy: "GLOBAL", rate: 10 },
        { strategy: "VENDOR", rate: 12, scope: { vendorId: "seller-1" } },
        { strategy: "CAMPAIGN", rate: 15, scope: { campaignId: "summer" } },
        { strategy: "REFERRAL", rate: 2, scope: { referrerId: "ref-1" } },
      ],
    });
    ledger = createLedgerFoundation();
  });

  function fundEscrow(amount) {
    const cash = ledger.chartOfAccounts.getByCode("CASH");
    const escrow = ledger.chartOfAccounts.getByCode("MARKETPLACE_ESCROW");
    ledger.engine.post({
      journalId: `fund-${amount}`,
      entries: [
        { accountId: cash.id, debit: amount, credit: 0 },
        { accountId: escrow.id, debit: 0, credit: amount },
      ],
    });
  }

  it("calculates breakdown with vendor rule over global", () => {
    const breakdown = commission.engine.calculate({
      grossAmount: 10000,
      vendorId: "seller-1",
    });
    assert.equal(breakdown.platformCommission, 1200);
    assert.equal(breakdown.netSellerAmount, 8800);
  });

  it("posts balanced escrow release journal via ledger interface", () => {
    fundEscrow(10000);
    const result = commission.engine.postEscrowRelease(
      { grossAmount: 10000, vendorId: "seller-1", referrerId: "ref-1" },
      ledger,
      { journalId: "comm-release-1", sellerId: "seller-1", reference: "order-1" }
    );

    assert.equal(result.breakdown.referralCommission, 200);
    assert.equal(ledger.engine.trialBalance().balanced, true);
    assert.equal(ledger.engine.accountBalanceByCode("MARKETPLACE_ESCROW"), 0);
  });

  it("exposes health contract", () => {
    const health = commission.engine.health();
    assert.equal(health.healthy, true);
    assert.equal(health.rules, 4);
  });
});
