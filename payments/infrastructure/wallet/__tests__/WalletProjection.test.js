const { describe, it, beforeEach } = require("node:test");
const assert = require("node:assert/strict");
const { createLedgerFoundation } = require("../../ledger");
const { createWalletFoundation } = require("../index");
const WalletProjection = require("../WalletProjection");

describe("WalletProjection", () => {
  let ledger;
  let projection;

  beforeEach(() => {
    ledger = createLedgerFoundation();
    projection = new WalletProjection();
  });

  it("derives seller balance from ledger entries", () => {
    const vendor = ledger.chartOfAccounts.getByCode("VENDOR_PAYABLE");
    const escrow = ledger.chartOfAccounts.getByCode("MARKETPLACE_ESCROW");
    ledger.engine.post({
      journalId: "release-1",
      entries: [
        { accountId: escrow.id, debit: 5000, credit: 0 },
        {
          accountId: vendor.id,
          debit: 0,
          credit: 5000,
          metadata: { sellerId: "seller-1" },
        },
      ],
    });

    const wallet = { walletId: "w-1", ownerId: "seller-1", type: "SELLER", state: "ACTIVE", currency: "UGX" };
    const balance = projection.projectBalance(wallet, ledger.engine, ledger.chartOfAccounts);
    assert.equal(balance.total, 5000);
    assert.equal(balance.source, "LEDGER");
  });
});

describe("WalletLedgerBridge", () => {
  it("projects transactions from ledger", () => {
    const ledger = createLedgerFoundation();
    const walletFoundation = createWalletFoundation({ ledgerFoundation: ledger });
    const seller = walletFoundation.service.create({ ownerId: "seller-2", type: "SELLER" });

    const vendor = ledger.chartOfAccounts.getByCode("VENDOR_PAYABLE");
    const escrow = ledger.chartOfAccounts.getByCode("MARKETPLACE_ESCROW");
    ledger.engine.post({
      journalId: "tx-1",
      entries: [
        { accountId: escrow.id, debit: 3000, credit: 0 },
        { accountId: vendor.id, debit: 0, credit: 3000, metadata: { sellerId: "seller-2" } },
      ],
    });

    const txs = walletFoundation.bridge.projectTransactions(seller);
    assert.equal(txs.length, 1);
    assert.equal(txs[0].credit, 3000);
  });
});
