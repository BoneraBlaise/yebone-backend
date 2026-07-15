const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const { ChartOfAccounts, DEFAULT_ACCOUNT_DEFINITIONS } = require("../ChartOfAccounts");
const { LedgerAccountType } = require("../LedgerAccountType");

const FUTURE_READY_CODES = [
  "AFFILIATE_COMMISSION_PAYABLE",
  "SELLER_BALANCE",
  "PENDING_PAYOUT",
  "PLATFORM_FEES_RECEIVABLE",
  "DISPUTE_HOLD",
  "LOYALTY_REWARDS",
  "PROMOTIONAL_CREDITS",
  "ACCOUNTS_RECEIVABLE",
  "ACCOUNTS_PAYABLE",
];

describe("ChartOfAccounts", () => {
  it("loads default accounts", () => {
    const chart = ChartOfAccounts.createDefault();
    assert.equal(chart.count(), DEFAULT_ACCOUNT_DEFINITIONS.length);
  });

  it("resolves accounts by code", () => {
    const chart = ChartOfAccounts.createDefault();
    const escrow = chart.getByCode("MARKETPLACE_ESCROW");
    assert.ok(escrow);
    assert.equal(escrow.type, LedgerAccountType.ESCROW);
    assert.equal(escrow.status, "ACTIVE");
  });

  it("includes settlement provider accounts", () => {
    const chart = ChartOfAccounts.createDefault();
    const codes = ["MTN_SETTLEMENT", "AIRTEL_SETTLEMENT", "FLUTTERWAVE_SETTLEMENT", "STRIPE_SETTLEMENT"];
    for (const code of codes) {
      assert.ok(chart.getByCode(code), `missing ${code}`);
    }
  });

  it("registers future-ready accounts as suspended and unused", () => {
    const chart = ChartOfAccounts.createDefault();
    for (const code of FUTURE_READY_CODES) {
      const account = chart.getByCode(code);
      assert.ok(account, `missing ${code}`);
      assert.equal(account.status, "SUSPENDED");
      assert.equal(account.metadata.futureReady, true);
      assert.equal(account.metadata.usage, "reserved");
    }
  });

  it("rejects duplicate account codes", () => {
    const chart = ChartOfAccounts.createDefault();
    const existing = chart.getByCode("CASH");
    assert.throws(() => chart.register(existing));
  });
});
