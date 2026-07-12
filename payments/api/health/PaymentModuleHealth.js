/**
 * Verifies payment module layers are loaded — no provider health checks.
 */
class PaymentModuleHealth {
  constructor(paymentModule) {
    this.paymentModule = paymentModule;
  }

  check() {
    const checks = {
      paymentModuleLoaded: Boolean(this.paymentModule),
      marketplacePaymentFacadeAvailable: Boolean(this.paymentModule?.getMarketplacePaymentFacade?.()),
      financialCoreLoaded: Boolean(this.paymentModule?.getSettlementEngine?.()),
      workflowsLoaded: Boolean(this.paymentModule?.getOrderPaymentWorkflow?.()),
      orchestrationLoaded: Boolean(this.paymentModule?.getTransactionCoordinator?.()),
    };

    const healthy = Object.values(checks).every(Boolean);

    return {
      healthy,
      checks,
      checkedAt: new Date().toISOString(),
    };
  }
}

module.exports = PaymentModuleHealth;
