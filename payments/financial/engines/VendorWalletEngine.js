/**
 * Vendor wallet accounting engine — pure calculations, no provider integration.
 */
class VendorWalletEngine {
  constructor({ financialRules }) {
    this.financialRules = financialRules;
  }

  /**
   * Compute full vendor wallet snapshot from ledger inputs.
   */
  calculateSnapshot({
    availableBalance = 0,
    pendingBalance = 0,
    reservedBalance = 0,
    escrowBalance = 0,
    lifetimeEarnings = 0,
    totalPayouts = 0,
    totalRefunds = 0,
    lockedBalance = 0,
  }) {
    const withdrawableBalance = Math.max(
      0,
      availableBalance - reservedBalance - lockedBalance
    );

    const snapshot = {
      availableBalance: Number(availableBalance.toFixed(2)),
      pendingBalance: Number(pendingBalance.toFixed(2)),
      reservedBalance: Number(reservedBalance.toFixed(2)),
      escrowBalance: Number(escrowBalance.toFixed(2)),
      withdrawableBalance: Number(withdrawableBalance.toFixed(2)),
      lockedBalance: Number(lockedBalance.toFixed(2)),
      lifetimeEarnings: Number(lifetimeEarnings.toFixed(2)),
      totalPayouts: Number(totalPayouts.toFixed(2)),
      totalRefunds: Number(totalRefunds.toFixed(2)),
      netEarnings: Number((lifetimeEarnings - totalPayouts - totalRefunds).toFixed(2)),
    };

    this.financialRules.validateWalletBalance(snapshot.availableBalance);
    return snapshot;
  }

  applyCredit(snapshot, amount) {
    return this.calculateSnapshot({
      ...snapshot,
      availableBalance: snapshot.availableBalance + amount,
      lifetimeEarnings: snapshot.lifetimeEarnings + amount,
    });
  }

  applyDebit(snapshot, amount) {
    return this.calculateSnapshot({
      ...snapshot,
      availableBalance: snapshot.availableBalance - amount,
      totalPayouts: snapshot.totalPayouts + amount,
    });
  }

  applyReserve(snapshot, amount) {
    return this.calculateSnapshot({
      ...snapshot,
      reservedBalance: snapshot.reservedBalance + amount,
    });
  }

  applyReleaseReserve(snapshot, amount) {
    return this.calculateSnapshot({
      ...snapshot,
      reservedBalance: Math.max(0, snapshot.reservedBalance - amount),
    });
  }
}

module.exports = VendorWalletEngine;
