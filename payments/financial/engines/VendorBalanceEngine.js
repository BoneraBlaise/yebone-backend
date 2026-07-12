/**
 * Vendor earnings categorization engine.
 */
class VendorBalanceEngine {
  constructor({ financialRules, vendorWalletEngine }) {
    this.financialRules = financialRules;
    this.vendorWalletEngine = vendorWalletEngine;
  }

  calculateEarningsBreakdown({
    pendingEarnings = 0,
    availableEarnings = 0,
    escrowEarnings = 0,
    lockedEarnings = 0,
    lifetimeEarnings = 0,
    totalPayouts = 0,
    totalRefunds = 0,
    reservedBalance = 0,
  }) {
    const walletSnapshot = this.vendorWalletEngine.calculateSnapshot({
      availableBalance: availableEarnings,
      pendingBalance: pendingEarnings,
      reservedBalance,
      escrowBalance: escrowEarnings,
      lockedBalance: lockedEarnings,
      lifetimeEarnings,
      totalPayouts,
      totalRefunds,
    });

    return {
      pendingEarnings: Number(pendingEarnings.toFixed(2)),
      availableEarnings: Number(availableEarnings.toFixed(2)),
      escrowEarnings: Number(escrowEarnings.toFixed(2)),
      withdrawableEarnings: walletSnapshot.withdrawableBalance,
      lockedEarnings: Number(lockedEarnings.toFixed(2)),
      lifetimeEarnings: walletSnapshot.lifetimeEarnings,
      totalPayouts: walletSnapshot.totalPayouts,
      totalRefunds: walletSnapshot.totalRefunds,
      netEarnings: walletSnapshot.netEarnings,
    };
  }
}

module.exports = VendorBalanceEngine;
