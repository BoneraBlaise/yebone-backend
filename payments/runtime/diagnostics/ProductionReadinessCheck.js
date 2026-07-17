/**
 * Production readiness checks — no provider health probes.
 */
class ProductionReadinessCheck {
  constructor({ runtime, logger }) {
    this.runtime = runtime;
    this.logger = logger;
  }

  run() {
    const checks = {
      facadeAvailable: Boolean(this.runtime.facade),
      financialCoreLoaded: Boolean(this.runtime.paymentModule?.getSettlementEngine?.()),
      workflowsLoaded: Boolean(this.runtime.paymentModule?.getOrderPaymentWorkflow?.()),
      orchestrationLoaded: Boolean(this.runtime.paymentModule?.getTransactionCoordinator?.()),
      routesPrepared: (this.runtime.apiLayer?.routeDefinitions?.length || 0) > 0,
      healthEndpointPrepared: this.runtime.apiLayer?.routeDefinitions?.some((r) =>
        r.fullPath?.includes("/health")
      ),
      loggingConfigured: Boolean(this.runtime.logger),
      shutdownConfigured: Boolean(this.runtime.shutdown),
      shutdownSignalHandlersRegistered: this.runtime.config.isProduction()
        ? Boolean(this.runtime.shutdown?.registered)
        : true,
      paymentFoundationWired: Boolean(this.runtime.paymentModule?.isPaymentFoundationWired?.()),
      paymentFoundationOptional: !this.runtime.config.composePaymentFoundation,
      webhookHandlersRegistered: (this.runtime.webhookRegistry?.list?.().length || 0) > 0,
      webhookRoutesEnabled:
        this.runtime.config.enableWebhooks === true &&
        (this.runtime.webhookRegistry?.list?.().length || 0) > 0,
      noProviderSdkIntegrated: true,
    };

    const healthy = Object.entries(checks)
      .filter(
        ([key]) =>
          key !== "noProviderSdkIntegrated" &&
          key !== "paymentFoundationWired" &&
          key !== "paymentFoundationOptional" &&
          key !== "webhookHandlersRegistered" &&
          key !== "webhookRoutesEnabled"
      )
      .every(([, value]) => value === true);

    const report = {
      healthy,
      checks,
      checkedAt: new Date().toISOString(),
    };

    this.logger?.info("Production readiness check completed", report);
    return report;
  }
}

module.exports = ProductionReadinessCheck;
