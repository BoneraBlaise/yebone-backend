/**
 * Startup diagnostics for payment runtime bootstrap.
 */
class StartupDiagnostics {
  constructor({ logger, runtime }) {
    this.logger = logger;
    this.runtime = runtime;
    this.entries = [];
  }

  record(name, status, details = {}) {
    const entry = { name, status, details, recordedAt: new Date().toISOString() };
    this.entries.push(entry);
    this.logger?.info("Startup diagnostic", entry);
    return entry;
  }

  run() {
    this.record("runtime_config", "ok", {
      serviceName: this.runtime.config.serviceName,
      environment: this.runtime.config.environment,
      apiVersion: this.runtime.config.apiVersion,
    });

    this.record("payment_module", this.runtime.paymentModule ? "ok" : "failed");
    this.record("marketplace_payment_facade", this.runtime.facade ? "ok" : "failed");
    this.record("api_layer", this.runtime.apiLayer ? "ok" : "failed");
    this.record("route_definitions", this.runtime.apiLayer?.routeDefinitions?.length ? "ok" : "failed", {
      count: this.runtime.apiLayer?.routeDefinitions?.length || 0,
    });

    this.record("webhook_registry", this.runtime.webhookRegistry?.list?.().length ? "ok" : "skipped", {
      handlers: this.runtime.webhookRegistry?.list?.() || [],
    });
    this.record(
      "webhook_routes_mounted",
      this.runtime.config.enableWebhooks && (this.runtime.webhookRegistry?.list?.().length || 0) > 0
        ? "ok"
        : "skipped",
      {
        enableWebhooks: this.runtime.config.enableWebhooks,
        composePaymentFoundation: this.runtime.config.composePaymentFoundation,
      }
    );

    this.record(
      "webhook_reconciliation",
      this.runtime.config.enableWebhookReconciliation ? "ok" : "skipped",
      {
        enableWebhookReconciliation: this.runtime.config.enableWebhookReconciliation,
        orchestratorWired: Boolean(this.runtime.webhookReconciliation?.orchestrator),
      }
    );

    return {
      healthy: this.entries.every((e) => e.status === "ok"),
      entries: this.entries,
    };
  }
}

module.exports = StartupDiagnostics;
