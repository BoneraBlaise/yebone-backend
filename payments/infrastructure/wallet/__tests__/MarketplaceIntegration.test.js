const { describe, it, beforeEach } = require("node:test");
const assert = require("node:assert/strict");
const { createLedgerFoundation } = require("../../ledger");
const { createCommissionEngine } = require("../../commission");
const { createWalletFoundation } = require("../index");

describe("Marketplace ledger integration (closure)", () => {
  let ledger;
  let commission;
  let wallet;

  beforeEach(() => {
    ledger = createLedgerFoundation();
    commission = createCommissionEngine({
      rules: [
        { strategy: "GLOBAL", rate: 10 },
        { strategy: "REFERRAL", rate: 2, scope: { referrerId: "ref-1" } },
      ],
    });
    wallet = createWalletFoundation({ ledgerFoundation: ledger });
  });

  function account(code) {
    return ledger.chartOfAccounts.getByCode(code);
  }

  function assertBalanced() {
    const trial = ledger.engine.trialBalance();
    assert.equal(trial.balanced, true);
  }

  it("commission posting remains balanced", () => {
    const cash = account("CASH");
    const escrow = account("MARKETPLACE_ESCROW");
    ledger.engine.post({
      journalId: "fund",
      entries: [
        { accountId: cash.id, debit: 10000, credit: 0 },
        { accountId: escrow.id, debit: 0, credit: 10000 },
      ],
    });
    commission.engine.postEscrowRelease(
      { grossAmount: 10000, referrerId: "ref-1" },
      ledger,
      { journalId: "comm", sellerId: "seller-1" }
    );
    assertBalanced();
  });

  it("seller payout flow remains balanced", () => {
    const vendor = account("VENDOR_PAYABLE");
    const escrow = account("MARKETPLACE_ESCROW");
    const bank = account("BANK");
    const cash = account("CASH");
    ledger.engine.post({
      journalId: "credit",
      entries: [
        { accountId: escrow.id, debit: 5000, credit: 0 },
        { accountId: vendor.id, debit: 0, credit: 5000, metadata: { sellerId: "s1" } },
      ],
    });
    ledger.engine.post({
      journalId: "bank-fund",
      entries: [
        { accountId: bank.id, debit: 5000, credit: 0 },
        { accountId: cash.id, debit: 0, credit: 5000 },
      ],
    });
    ledger.engine.post({
      journalId: "payout",
      entries: [
        { accountId: vendor.id, debit: 5000, credit: 0, metadata: { sellerId: "s1" } },
        { accountId: bank.id, debit: 0, credit: 5000 },
      ],
    });
    assertBalanced();
  });

  it("refund and partial refund via reversal stay balanced", () => {
    const vendor = account("VENDOR_PAYABLE");
    const escrow = account("MARKETPLACE_ESCROW");
    const cash = account("CASH");
    ledger.engine.post({
      journalId: "pay",
      entries: [
        { accountId: cash.id, debit: 8000, credit: 0 },
        { accountId: escrow.id, debit: 0, credit: 8000 },
      ],
    });
    ledger.engine.post({
      journalId: "release",
      entries: [
        { accountId: escrow.id, debit: 8000, credit: 0 },
        { accountId: vendor.id, debit: 0, credit: 8000, metadata: { sellerId: "s2" } },
      ],
    });
    ledger.engine.reverse("release", { journalId: "partial-refund" });
    assertBalanced();
    assert.equal(ledger.engine.accountBalanceByCode("MARKETPLACE_ESCROW"), 8000);
    assert.equal(ledger.engine.accountBalanceByCode("VENDOR_PAYABLE"), 0);
  });

  it("chargeback and dispute hold flows stay balanced", () => {
    const escrow = account("MARKETPLACE_ESCROW");
    const reserve = account("CHARGEBACK_RESERVE");
    const cash = account("CASH");
    ledger.engine.post({
      journalId: "order",
      entries: [
        { accountId: cash.id, debit: 6000, credit: 0 },
        { accountId: escrow.id, debit: 0, credit: 6000 },
      ],
    });
    ledger.engine.post({
      journalId: "dispute",
      entries: [
        { accountId: escrow.id, debit: 6000, credit: 0 },
        { accountId: reserve.id, debit: 0, credit: 6000 },
      ],
    });
    assertBalanced();
  });

  it("wallet projection derives seller balance from ledger only", () => {
    const vendor = account("VENDOR_PAYABLE");
    const escrow = account("MARKETPLACE_ESCROW");
    ledger.engine.post({
      journalId: "wallet-credit",
      entries: [
        { accountId: escrow.id, debit: 4000, credit: 0 },
        { accountId: vendor.id, debit: 0, credit: 4000, metadata: { sellerId: "seller-w" } },
      ],
    });
    const sellerWallet = wallet.service.create({ ownerId: "seller-w", type: "SELLER" });
    assert.equal(wallet.service.getBalance(sellerWallet.walletId).total, 4000);
    assert.equal(wallet.service.getBalance(sellerWallet.walletId).source, "LEDGER");
  });
});
