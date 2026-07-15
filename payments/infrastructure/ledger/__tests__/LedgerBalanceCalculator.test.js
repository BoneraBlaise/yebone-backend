const { describe, it, beforeEach } = require("node:test");
const assert = require("node:assert/strict");
const { createLedgerFoundation } = require("../index");

describe("LedgerBalanceCalculator", () => {
  let foundation;

  beforeEach(() => {
    foundation = createLedgerFoundation();
  });

  function postPayment(amount) {
    const cash = foundation.chartOfAccounts.getByCode("CASH");
    const escrow = foundation.chartOfAccounts.getByCode("MARKETPLACE_ESCROW");
    foundation.engine.post({
      journalId: `pay-${amount}`,
      entries: [
        { accountId: cash.id, debit: amount, credit: 0 },
        { accountId: escrow.id, debit: 0, credit: amount },
      ],
    });
  }

  it("computes account balance from entries", () => {
    postPayment(10000);
    const cash = foundation.chartOfAccounts.getByCode("CASH");
    assert.equal(foundation.engine.accountBalance(cash.id), 10000);
  });

  it("computes escrow liability balance", () => {
    postPayment(7500);
    const escrow = foundation.chartOfAccounts.getByCode("MARKETPLACE_ESCROW");
    assert.equal(foundation.engine.accountBalance(escrow.id), 7500);
  });

  it("produces balanced trial balance", () => {
    postPayment(5000);
    postPayment(3000);
    const trial = foundation.engine.trialBalance();
    assert.equal(trial.balanced, true);
    assert.equal(trial.totalDebit, 8000);
    assert.equal(trial.totalCredit, 8000);
  });

  it("builds general ledger with running balances", () => {
    postPayment(2000);
    const gl = foundation.engine.generalLedger();
    const cashLedger = gl.find((row) => row.code === "CASH");
    assert.equal(cashLedger.closingBalance, 2000);
    assert.equal(cashLedger.entries.length, 1);
    assert.equal(cashLedger.entries[0].runningBalance, 2000);
  });

  it("derives current balance without cache", () => {
    postPayment(1500);
    const current = foundation.engine.currentBalance();
    assert.equal(current.totalDebit, 1500);
    assert.equal(current.totalCredit, 1500);
    assert.equal(current.net, 0);
  });
});
