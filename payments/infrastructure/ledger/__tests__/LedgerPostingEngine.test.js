const { describe, it, beforeEach } = require("node:test");
const assert = require("node:assert/strict");
const { createLedgerFoundation } = require("../index");
const DuplicateJournalError = require("../errors/DuplicateJournalError");
const AccountNotFoundError = require("../errors/AccountNotFoundError");
const UnbalancedJournalError = require("../errors/UnbalancedJournalError");

describe("LedgerPostingEngine", () => {
  let foundation;

  beforeEach(() => {
    foundation = createLedgerFoundation();
  });

  function balancedEntries(amount = 5000) {
    const cash = foundation.chartOfAccounts.getByCode("CASH");
    const escrow = foundation.chartOfAccounts.getByCode("MARKETPLACE_ESCROW");
    return [
      { accountId: cash.id, debit: amount, credit: 0 },
      { accountId: escrow.id, debit: 0, credit: amount },
    ];
  }

  it("posts balanced journal", () => {
    const tx = foundation.engine.post({
      journalId: "post-1",
      reference: "order-1",
      entries: balancedEntries(),
    });
    assert.equal(tx.status, "POSTED");
    assert.equal(foundation.engine.getEntries().length, 2);
  });

  it("rejects duplicate journal id", () => {
    foundation.engine.post({ journalId: "dup-1", entries: balancedEntries() });
    assert.throws(
      () => foundation.engine.post({ journalId: "dup-1", entries: balancedEntries() }),
      DuplicateJournalError
    );
  });

  it("rejects unknown account", () => {
    assert.throws(
      () =>
        foundation.engine.post({
          journalId: "bad-acc",
          entries: [
            { accountId: "missing", debit: 100, credit: 0 },
            { accountId: foundation.chartOfAccounts.getByCode("CASH").id, debit: 0, credit: 100 },
          ],
        }),
      AccountNotFoundError
    );
  });

  it("rejects unbalanced posting", () => {
    const cash = foundation.chartOfAccounts.getByCode("CASH");
    const escrow = foundation.chartOfAccounts.getByCode("MARKETPLACE_ESCROW");
    assert.throws(
      () =>
        foundation.engine.post({
          journalId: "unbalanced",
          entries: [
            { accountId: cash.id, debit: 100, credit: 0 },
            { accountId: escrow.id, debit: 0, credit: 50 },
          ],
        }),
      UnbalancedJournalError
    );
  });

  it("posts reversal without modifying original entries", () => {
    foundation.engine.post({ journalId: "orig-1", entries: balancedEntries(1000) });
    const originalCount = foundation.engine.getEntries().length;
    foundation.engine.reverse("orig-1", { journalId: "rev-1" });
    assert.equal(foundation.engine.getEntries().length, originalCount + 2);
    assert.equal(foundation.engine.getJournals().length, 2);
  });
});
