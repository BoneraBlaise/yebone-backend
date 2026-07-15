const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const { createLedgerFoundation } = require("../../ledger");
const { createWalletFoundation } = require("../index");

describe("WalletLedgerBridge", () => {
  it("reads balance without storing it in wallet", () => {
    const ledger = createLedgerFoundation();
    const wallet = createWalletFoundation({ ledgerFoundation: ledger });
    const seller = wallet.service.create({ ownerId: "seller-3", type: "SELLER" });

    const vendor = ledger.chartOfAccounts.getByCode("VENDOR_PAYABLE");
    const escrow = ledger.chartOfAccounts.getByCode("MARKETPLACE_ESCROW");
    ledger.engine.post({
      journalId: "bridge-1",
      entries: [
        { accountId: escrow.id, debit: 7500, credit: 0 },
        { accountId: vendor.id, debit: 0, credit: 7500, metadata: { sellerId: "seller-3" } },
      ],
    });

    const balance = wallet.bridge.getBalance(seller);
    assert.equal(balance.total, 7500);
    assert.equal(wallet.service.getBalance(seller.walletId).total, 7500);
  });
});
