const LedgerAccount = require("./LedgerAccount");
const { LedgerAccountType } = require("./LedgerAccountType");
const LedgerConfig = require("./LedgerConfig");

const DEFAULT_ACCOUNT_DEFINITIONS = [
  { code: "CUSTOMER_CLEARING", name: "Customer Clearing", type: LedgerAccountType.CLEARING },
  { code: "MARKETPLACE_ESCROW", name: "Marketplace Escrow", type: LedgerAccountType.ESCROW },
  { code: "VENDOR_PAYABLE", name: "Vendor Payable", type: LedgerAccountType.LIABILITY },
  { code: "PLATFORM_REVENUE", name: "Platform Revenue", type: LedgerAccountType.REVENUE },
  { code: "PLATFORM_COMMISSION", name: "Platform Commission", type: LedgerAccountType.REVENUE },
  { code: "REFERRAL_COMMISSION", name: "Referral Commission", type: LedgerAccountType.EXPENSE },
  { code: "SETTLEMENT_ACCOUNT", name: "Settlement Account", type: LedgerAccountType.ASSET },
  { code: "REFUND_RESERVE", name: "Refund Reserve", type: LedgerAccountType.RESERVE },
  { code: "CHARGEBACK_RESERVE", name: "Chargeback Reserve", type: LedgerAccountType.RESERVE },
  { code: "CASH", name: "Cash", type: LedgerAccountType.ASSET },
  { code: "BANK", name: "Bank", type: LedgerAccountType.ASSET },
  { code: "MTN_SETTLEMENT", name: "MTN Settlement", type: LedgerAccountType.ASSET },
  { code: "AIRTEL_SETTLEMENT", name: "Airtel Settlement", type: LedgerAccountType.ASSET },
  { code: "FLUTTERWAVE_SETTLEMENT", name: "Flutterwave Settlement", type: LedgerAccountType.ASSET },
  { code: "STRIPE_SETTLEMENT", name: "Stripe Settlement", type: LedgerAccountType.ASSET },
  { code: "TAX_PAYABLE", name: "Tax Payable", type: LedgerAccountType.LIABILITY },
  {
    code: "AFFILIATE_COMMISSION_PAYABLE",
    name: "Affiliate Commission Payable",
    type: LedgerAccountType.LIABILITY,
    status: "SUSPENDED",
    metadata: { futureReady: true, usage: "reserved" },
  },
  {
    code: "SELLER_BALANCE",
    name: "Seller Balance",
    type: LedgerAccountType.LIABILITY,
    status: "SUSPENDED",
    metadata: { futureReady: true, usage: "reserved" },
  },
  {
    code: "PENDING_PAYOUT",
    name: "Pending Payout",
    type: LedgerAccountType.LIABILITY,
    status: "SUSPENDED",
    metadata: { futureReady: true, usage: "reserved" },
  },
  {
    code: "PLATFORM_FEES_RECEIVABLE",
    name: "Platform Fees Receivable",
    type: LedgerAccountType.ASSET,
    status: "SUSPENDED",
    metadata: { futureReady: true, usage: "reserved" },
  },
  {
    code: "DISPUTE_HOLD",
    name: "Dispute Hold",
    type: LedgerAccountType.ESCROW,
    status: "SUSPENDED",
    metadata: { futureReady: true, usage: "reserved" },
  },
  {
    code: "LOYALTY_REWARDS",
    name: "Loyalty Rewards",
    type: LedgerAccountType.RESERVE,
    status: "SUSPENDED",
    metadata: { futureReady: true, usage: "reserved" },
  },
  {
    code: "PROMOTIONAL_CREDITS",
    name: "Promotional Credits",
    type: LedgerAccountType.LIABILITY,
    status: "SUSPENDED",
    metadata: { futureReady: true, usage: "reserved" },
  },
  {
    code: "ACCOUNTS_RECEIVABLE",
    name: "Accounts Receivable",
    type: LedgerAccountType.ASSET,
    status: "SUSPENDED",
    metadata: {
      futureReady: true,
      usage: "reserved",
      purpose: "Invoice, B2B and corporate billing receivables",
    },
  },
  {
    code: "ACCOUNTS_PAYABLE",
    name: "Accounts Payable",
    type: LedgerAccountType.LIABILITY,
    status: "SUSPENDED",
    metadata: {
      futureReady: true,
      usage: "reserved",
      purpose: "Supplier, operations and corporate liabilities",
    },
  },
];

/**
 * Default chart of accounts for marketplace payment flows.
 */
class ChartOfAccounts {
  constructor(options = {}) {
    this.currency = options.currency || LedgerConfig.defaultCurrency;
    this.accounts = new Map();
    this.accountsByCode = new Map();
  }

  static createDefault(options = {}) {
    const chart = new ChartOfAccounts(options);
    chart.loadDefaults();
    return chart;
  }

  loadDefaults() {
    for (const definition of DEFAULT_ACCOUNT_DEFINITIONS) {
      this.register(
        LedgerAccount.create({
          ...definition,
          currency: this.currency,
          status: definition.status || "ACTIVE",
          metadata: {
            system: true,
            ...(definition.metadata || {}),
          },
        })
      );
    }
    return this;
  }

  register(account) {
    const normalized = LedgerAccount.create(account);
    if (this.accounts.has(normalized.id)) {
      throw new Error(`Account already registered: ${normalized.id}`);
    }
    if (this.accountsByCode.has(normalized.code)) {
      throw new Error(`Account code already registered: ${normalized.code}`);
    }
    this.accounts.set(normalized.id, normalized);
    this.accountsByCode.set(normalized.code, normalized);
    return normalized;
  }

  getById(accountId) {
    return this.accounts.get(accountId) || null;
  }

  getByCode(code) {
    return this.accountsByCode.get(String(code).trim().toUpperCase()) || null;
  }

  list() {
    return Array.from(this.accounts.values());
  }

  count() {
    return this.accounts.size;
  }
}

module.exports = {
  ChartOfAccounts,
  DEFAULT_ACCOUNT_DEFINITIONS,
};
