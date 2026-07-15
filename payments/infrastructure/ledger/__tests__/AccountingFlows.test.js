const { describe, it, beforeEach } = require("node:test");
const assert = require("node:assert/strict");
const { createLedgerFoundation } = require("../index");
const InvalidPostingError = require("../errors/InvalidPostingError");

describe("Accounting flows (double-entry verification)", () => {
  let foundation;

  beforeEach(() => {
    foundation = createLedgerFoundation();
  });

  function account(code) {
    return foundation.chartOfAccounts.getByCode(code);
  }

  function assertBalanced() {
    const trial = foundation.engine.trialBalance();
    assert.equal(trial.balanced, true, "trial balance must balance");
    assert.equal(trial.totalDebit, trial.totalCredit);
  }

  it("escrow: buyer payment to release with commission split", () => {
    foundation.engine.post({
      journalId: "escrow-pay",
      buyerId: "buyer-1",
      sellerId: "seller-1",
      entries: [
        { accountId: account("CASH").id, debit: 10000, credit: 0 },
        { accountId: account("MARKETPLACE_ESCROW").id, debit: 0, credit: 10000 },
      ],
    });

    foundation.engine.post({
      journalId: "escrow-release",
      sellerId: "seller-1",
      entries: [
        { accountId: account("MARKETPLACE_ESCROW").id, debit: 10000, credit: 0 },
        { accountId: account("VENDOR_PAYABLE").id, debit: 0, credit: 8200 },
        { accountId: account("PLATFORM_COMMISSION").id, debit: 0, credit: 1500 },
        { accountId: account("REFERRAL_COMMISSION").id, debit: 0, credit: 300 },
      ],
    });

    assertBalanced();
    assert.equal(foundation.engine.accountBalanceByCode("MARKETPLACE_ESCROW"), 0);
    assert.equal(foundation.engine.accountBalanceByCode("VENDOR_PAYABLE"), 8200);
  });

  it("payout: vendor payable to bank settlement", () => {
    foundation.engine.post({
      journalId: "credit-vendor",
      entries: [
        { accountId: account("CASH").id, debit: 5000, credit: 0 },
        { accountId: account("VENDOR_PAYABLE").id, debit: 0, credit: 5000 },
      ],
    });

    foundation.engine.post({
      journalId: "fund-bank",
      entries: [
        { accountId: account("BANK").id, debit: 5000, credit: 0 },
        { accountId: account("CASH").id, debit: 0, credit: 5000 },
      ],
    });

    foundation.engine.post({
      journalId: "payout-bank",
      providerCode: "FLUTTERWAVE",
      paymentMethod: "BANK_TRANSFER",
      entries: [
        { accountId: account("VENDOR_PAYABLE").id, debit: 5000, credit: 0 },
        { accountId: account("BANK").id, debit: 0, credit: 5000 },
      ],
    });

    assertBalanced();
    assert.equal(foundation.engine.accountBalanceByCode("VENDOR_PAYABLE"), 0);
    assert.equal(foundation.engine.accountBalanceByCode("BANK"), 0);
    assert.equal(foundation.engine.accountBalanceByCode("CASH"), 0);
  });

  it("refund: reversing journal restores escrow without editing original entries", () => {
    foundation.engine.post({
      journalId: "order-pay",
      entries: [
        { accountId: account("CASH").id, debit: 8000, credit: 0 },
        { accountId: account("MARKETPLACE_ESCROW").id, debit: 0, credit: 8000 },
      ],
    });

    foundation.engine.post({
      journalId: "partial-release",
      entries: [
        { accountId: account("MARKETPLACE_ESCROW").id, debit: 8000, credit: 0 },
        { accountId: account("VENDOR_PAYABLE").id, debit: 0, credit: 8000 },
      ],
    });

    const entriesBeforeReversal = foundation.engine.getEntries().length;
    foundation.engine.reverse("partial-release", { journalId: "refund-reversal" });

    assert.equal(foundation.engine.getEntries().length, entriesBeforeReversal + 2);
    assertBalanced();
    assert.equal(foundation.engine.accountBalanceByCode("VENDOR_PAYABLE"), 0);
    assert.equal(foundation.engine.accountBalanceByCode("MARKETPLACE_ESCROW"), 8000);
  });

  it("dispute: escrow hold pattern balances using active reserve account", () => {
    foundation.engine.post({
      journalId: "dispute-fund",
      shopId: "shop-dispute",
      entries: [
        { accountId: account("CASH").id, debit: 6000, credit: 0 },
        { accountId: account("MARKETPLACE_ESCROW").id, debit: 0, credit: 6000 },
      ],
    });

    foundation.engine.post({
      journalId: "dispute-hold",
      metadata: { disputeId: "disp-001", flow: "DISPUTE_HOLD" },
      entries: [
        { accountId: account("MARKETPLACE_ESCROW").id, debit: 6000, credit: 0 },
        { accountId: account("CHARGEBACK_RESERVE").id, debit: 0, credit: 6000 },
      ],
    });

    assertBalanced();
    assert.equal(foundation.engine.accountBalanceByCode("MARKETPLACE_ESCROW"), 0);
    assert.equal(foundation.engine.accountBalanceByCode("CHARGEBACK_RESERVE"), 6000);
  });

  it("commission split: multi-line journal supports all commission types", () => {
    foundation.engine.post({
      journalId: "commission-order",
      tenantId: "tenant-a",
      metadata: {
        categoryId: "electronics",
        campaignId: "summer-sale",
        subscriptionTier: "pro",
        commissionTypes: ["global", "vendor", "category", "campaign", "referral", "subscription"],
      },
      entries: [
        { accountId: account("CASH").id, debit: 20000, credit: 0 },
        { accountId: account("MARKETPLACE_ESCROW").id, debit: 0, credit: 20000 },
      ],
    });

    foundation.engine.post({
      journalId: "commission-split",
      sellerId: "seller-42",
      entries: [
        { accountId: account("MARKETPLACE_ESCROW").id, debit: 20000, credit: 0 },
        { accountId: account("VENDOR_PAYABLE").id, debit: 0, credit: 15500 },
        { accountId: account("PLATFORM_COMMISSION").id, debit: 0, credit: 3000 },
        { accountId: account("REFERRAL_COMMISSION").id, debit: 0, credit: 1500 },
      ],
    });

    assertBalanced();
  });

  it("blocks posting to suspended future-ready accounts", () => {
    const suspended = account("DISPUTE_HOLD");
    const cash = account("CASH");
    assert.throws(
      () =>
        foundation.engine.post({
          journalId: "blocked-dispute",
          entries: [
            { accountId: cash.id, debit: 1000, credit: 0 },
            { accountId: suspended.id, debit: 0, credit: 1000 },
          ],
        }),
      InvalidPostingError
    );
  });
});
