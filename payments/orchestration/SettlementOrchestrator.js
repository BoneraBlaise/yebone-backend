/**
 * Coordinates settlement engines and accounting ledger — calculation only.
 */
class SettlementOrchestrator {
  constructor({
    settlementEngine,
    commissionEngine,
    vendorBalanceEngine,
    vendorWalletEngine,
    deliverySettlementEngine,
    accountingLedger,
    auditService,
    idempotencyService,
  }) {
    this.settlementEngine = settlementEngine;
    this.commissionEngine = commissionEngine;
    this.vendorBalanceEngine = vendorBalanceEngine;
    this.vendorWalletEngine = vendorWalletEngine;
    this.deliverySettlementEngine = deliverySettlementEngine;
    this.accountingLedger = accountingLedger;
    this.auditService = auditService;
    this.idempotencyService = idempotencyService;
  }

  async settle(input) {
    const key = input.idempotencyKey || `settlement:${input.orderId}`;
    return this.idempotencyService.execute(key, input, async () => {
      const settlement = this.settlementEngine.settleOrder(input);
      const commission = settlement.commission;
      const delivery = settlement.delivery;
      const vendorBalance = settlement.vendorBalance;

      const walletSnapshot = this.vendorWalletEngine.calculateSnapshot({
        availableBalance: vendorBalance.availableEarnings,
        pendingBalance: vendorBalance.pendingEarnings,
        escrowBalance: vendorBalance.escrowEarnings,
        lockedBalance: vendorBalance.lockedEarnings,
        lifetimeEarnings: vendorBalance.lifetimeEarnings,
        totalPayouts: vendorBalance.totalPayouts,
        totalRefunds: vendorBalance.totalRefunds,
      });

      this.auditService.recordSettlement("settlement_orchestrated", input.orderId, {
        commission,
        delivery,
        vendorBalance,
        walletSnapshot,
      });

      return {
        coordinated: true,
        settlement,
        commission,
        delivery,
        vendorBalance,
        walletSnapshot,
        journals: this.accountingLedger.getJournals(),
      };
    });
  }

  preview(input) {
    const commission = this.commissionEngine.calculate({
      orderSubtotal: input.orderSubtotal,
      ...input.commissionInput,
    });
    const delivery = this.deliverySettlementEngine.calculate({
      deliveryFee: input.deliveryFee,
      ...input.deliveryInput,
    });
    const vendorBalance = this.vendorBalanceEngine.calculateEarningsBreakdown({
      pendingEarnings: commission.vendorAmount,
      escrowEarnings: input.orderSubtotal,
      ...input.vendorBalanceInput,
    });

    return { coordinated: true, commission, delivery, vendorBalance };
  }
}

module.exports = SettlementOrchestrator;
