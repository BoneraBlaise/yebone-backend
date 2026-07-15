const { describe, it, beforeEach } = require("node:test");
const assert = require("node:assert/strict");
const { createLedgerFoundation } = require("../../ledger");
const { createWalletFoundation } = require("../index");
const WalletFrozenError = require("../errors/WalletFrozenError");
const InsufficientBalanceError = require("../errors/InsufficientBalanceError");

describe("WalletService", () => {
  let ledger;
  let wallet;

  beforeEach(() => {
    ledger = createLedgerFoundation();
    wallet = createWalletFoundation({ ledgerFoundation: ledger });
  });

  function creditSeller(sellerId, amount) {
    const vendor = ledger.chartOfAccounts.getByCode("VENDOR_PAYABLE");
    const escrow = ledger.chartOfAccounts.getByCode("MARKETPLACE_ESCROW");
    ledger.engine.post({
      journalId: `credit-${sellerId}-${amount}`,
      entries: [
        { accountId: escrow.id, debit: amount, credit: 0 },
        { accountId: vendor.id, debit: 0, credit: amount, metadata: { sellerId } },
      ],
    });
  }

  it("supports seller, platform, referral, reserve and pending payout types", () => {
    const types = [
      "SELLER",
      "PLATFORM",
      "REFERRAL",
      "RESERVE",
      "PENDING_PAYOUT",
      "ESCROW",
      "BONUS",
      "PROMOTIONAL",
    ];
    for (const type of types) {
      const created = wallet.service.create({ ownerId: `owner-${type}`, type });
      assert.equal(created.type, type);
    }
    assert.equal(wallet.service.list().length, 8);
  });

  it("freezes and unfreezes wallet state", () => {
    const seller = wallet.service.create({ ownerId: "seller-f", type: "SELLER" });
    creditSeller("seller-f", 2000);

    wallet.service.freeze(seller.walletId);
    const frozenBalance = wallet.service.getBalance(seller.walletId);
    assert.equal(frozenBalance.available, 0);
    assert.equal(frozenBalance.pending, 2000);

    wallet.service.unfreeze(seller.walletId);
    const activeBalance = wallet.service.getBalance(seller.walletId);
    assert.equal(activeBalance.available, 2000);
  });

  it("throws when frozen wallet used for debit assertion", () => {
    const seller = wallet.service.create({ ownerId: "seller-x", type: "SELLER" });
    creditSeller("seller-x", 1000);
    wallet.service.freeze(seller.walletId);
    assert.throws(() => wallet.service.assertAvailable(seller.walletId, 100), WalletFrozenError);
  });

  it("throws on insufficient balance", () => {
    const seller = wallet.service.create({ ownerId: "seller-y", type: "SELLER" });
    creditSeller("seller-y", 500);
    assert.throws(
      () => wallet.service.assertAvailable(seller.walletId, 1000),
      InsufficientBalanceError
    );
  });

  it("exposes health contract", () => {
    wallet.service.create({ ownerId: "seller-z", type: "SELLER" });
    const health = wallet.service.health();
    assert.equal(health.sourceOfTruth, "LEDGER");
    assert.equal(health.wallets, 1);
  });
});
