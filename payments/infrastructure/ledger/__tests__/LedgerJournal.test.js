const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const LedgerJournal = require("../LedgerJournal");
const UnbalancedJournalError = require("../errors/UnbalancedJournalError");
const InvalidPostingError = require("../errors/InvalidPostingError");

describe("LedgerJournal", () => {
  const baseEntries = [
    { accountId: "acc-1", debit: 100, credit: 0 },
    { accountId: "acc-2", debit: 0, credit: 100 },
  ];

  it("creates balanced journal", () => {
    const journal = LedgerJournal.create({
      journalId: "jrnl-1",
      entries: baseEntries,
    });
    assert.equal(journal.entries.length, 2);
    assert.equal(journal.journalId, "jrnl-1");
  });

  it("rejects unbalanced journal", () => {
    assert.throws(
      () =>
        LedgerJournal.create({
          journalId: "jrnl-bad",
          entries: [
            { accountId: "acc-1", debit: 100, credit: 0 },
            { accountId: "acc-2", debit: 0, credit: 50 },
          ],
        }),
      UnbalancedJournalError
    );
  });

  it("rejects empty journal", () => {
    assert.throws(
      () => LedgerJournal.create({ journalId: "empty", entries: [] }),
      InvalidPostingError
    );
  });

  it("creates reversal journal with swapped debits and credits", () => {
    const original = LedgerJournal.create({
      journalId: "jrnl-orig",
      entries: baseEntries,
    });
    const reversal = LedgerJournal.createReversal(original, { journalId: "jrnl-rev" });
    assert.equal(reversal.metadata.reversalOf, "jrnl-orig");
    assert.equal(reversal.entries[0].debit, 0);
    assert.equal(reversal.entries[0].credit, 100);
    assert.equal(reversal.entries[1].debit, 100);
    assert.equal(reversal.entries[1].credit, 0);
  });

  it("accepts optional reporting metadata without requiring it", () => {
    const journal = LedgerJournal.create({
      journalId: "jrnl-meta",
      tenantId: "tenant-1",
      shopId: "shop-9",
      sellerId: "seller-3",
      buyerId: "buyer-7",
      providerCode: "MTN",
      paymentMethod: "MOBILE_MONEY",
      countryCode: "UG",
      currencyRate: 3750.25,
      entries: baseEntries,
    });
    assert.equal(journal.metadata.tenantId, "tenant-1");
    assert.equal(journal.metadata.shopId, "shop-9");
    assert.equal(journal.metadata.sellerId, "seller-3");
    assert.equal(journal.metadata.buyerId, "buyer-7");
    assert.equal(journal.metadata.providerCode, "MTN");
    assert.equal(journal.metadata.paymentMethod, "MOBILE_MONEY");
    assert.equal(journal.metadata.countryCode, "UG");
    assert.equal(journal.metadata.currencyRate, 3750.25);
  });

  it("creates journal without optional reporting metadata", () => {
    const journal = LedgerJournal.create({
      journalId: "jrnl-no-meta",
      entries: baseEntries,
    });
    assert.deepEqual(journal.metadata, {});
  });
});
