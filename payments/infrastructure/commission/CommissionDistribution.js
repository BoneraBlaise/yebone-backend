const InvalidPostingError = require("../ledger/errors/InvalidPostingError");

/**
 * Maps commission breakdown to balanced ledger journal entries.
 * Uses ledger chart of accounts via interface — does not modify ledger.
 */
class CommissionDistribution {
  static buildEscrowReleaseEntries(breakdown, chartOfAccounts, options = {}) {
    if (!breakdown) {
      throw new InvalidPostingError("Commission breakdown is required");
    }
    if (!chartOfAccounts) {
      throw new InvalidPostingError("Chart of accounts is required");
    }

    const escrow = chartOfAccounts.getByCode("MARKETPLACE_ESCROW");
    const vendor = chartOfAccounts.getByCode("VENDOR_PAYABLE");
    const platform = chartOfAccounts.getByCode("PLATFORM_COMMISSION");
    const referral = chartOfAccounts.getByCode("REFERRAL_COMMISSION");
    const tax = chartOfAccounts.getByCode("TAX_PAYABLE");

    if (!escrow || !vendor || !platform || !referral || !tax) {
      throw new InvalidPostingError("Required ledger accounts missing for commission distribution");
    }

    const entryMetadata = {
      sellerId: options.sellerId,
      buyerId: options.buyerId,
      tenantId: options.tenantId,
      ...(options.entryMetadata || {}),
    };

    const withMeta = (entry) => ({
      ...entry,
      metadata: { ...entryMetadata, ...(entry.metadata || {}) },
    });

    const entries = [
      withMeta({ accountId: escrow.id, debit: breakdown.grossAmount, credit: 0 }),
      withMeta({ accountId: vendor.id, debit: 0, credit: breakdown.netSellerAmount }),
      withMeta({ accountId: platform.id, debit: 0, credit: breakdown.platformCommission }),
    ];

    if (breakdown.referralCommission > 0) {
      entries.push(withMeta({ accountId: referral.id, debit: 0, credit: breakdown.referralCommission }));
    }

    if (breakdown.tax > 0) {
      entries.push(withMeta({ accountId: tax.id, debit: 0, credit: breakdown.tax }));
    }

    return Object.freeze(entries);
  }

  static buildEscrowReleaseJournalInput(breakdown, chartOfAccounts, options = {}) {
    return {
      journalId: options.journalId,
      description: options.description || "Commission escrow release",
      reference: options.reference,
      correlationId: options.correlationId,
      requestId: options.requestId,
      currency: breakdown.currency,
      sellerId: options.sellerId,
      buyerId: options.buyerId,
      tenantId: options.tenantId,
      metadata: {
        ...(options.metadata || {}),
        commissionBreakdown: {
          grossAmount: breakdown.grossAmount,
          platformCommission: breakdown.platformCommission,
          referralCommission: breakdown.referralCommission,
          couponCommission: breakdown.couponCommission,
          tax: breakdown.tax,
          netSellerAmount: breakdown.netSellerAmount,
          platformRevenue: breakdown.platformRevenue,
          ruleSnapshots: breakdown.ruleSnapshots,
        },
      },
      entries: CommissionDistribution.buildEscrowReleaseEntries(breakdown, chartOfAccounts, options),
    };
  }
}

module.exports = CommissionDistribution;
