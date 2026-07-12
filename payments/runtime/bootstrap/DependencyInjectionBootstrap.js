const { createPaymentApi } = require("../../api");
const { RuntimeConfig } = require("../config");
const { Logger } = require("../logging");
const { JobScheduler } = require("../jobs");
const { WebhookRegistry } = require("../webhooks");
const { GracefulShutdown } = require("../shutdown");
const { StartupDiagnostics, ProductionReadinessCheck } = require("../diagnostics");

/**
 * Dependency injection bootstrap for payment runtime.
 */
class DependencyInjectionBootstrap {
  static create(options = {}) {
    const PaymentModule = require("../../PaymentModule");
    const config = new RuntimeConfig(options.config || {});
    const logger = new Logger({ serviceName: config.serviceName, level: config.logLevel });
    const paymentModule = options.paymentModule || new PaymentModule(options.paymentModuleOptions || {});
    const facade = paymentModule.getMarketplacePaymentFacade();
    const apiLayer = createPaymentApi(paymentModule);
    const jobScheduler = new JobScheduler({ logger: logger.child({ component: "jobs" }) });
    const webhookRegistry = new WebhookRegistry();
    const shutdown = new GracefulShutdown({
      logger: logger.child({ component: "shutdown" }),
      timeoutMs: config.shutdownTimeoutMs,
    });

    const runtime = {
      config,
      logger,
      paymentModule,
      facade,
      apiLayer,
      jobScheduler,
      webhookRegistry,
      shutdown,
    };

    const startupDiagnostics = new StartupDiagnostics({ logger, runtime });
    const productionReadiness = new ProductionReadinessCheck({ runtime, logger });

    return {
      ...runtime,
      startupDiagnostics,
      productionReadiness,
    };
  }
}

module.exports = DependencyInjectionBootstrap;
