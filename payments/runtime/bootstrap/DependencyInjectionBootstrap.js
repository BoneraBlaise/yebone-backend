const { createPaymentApi } = require("../../api");
const { RuntimeConfig } = require("../config");
const { Logger } = require("../logging");
const { JobScheduler } = require("../jobs");
const { WebhookRegistry } = require("../webhooks");
const { GracefulShutdown } = require("../shutdown");
const { StartupDiagnostics, ProductionReadinessCheck } = require("../diagnostics");
const PaymentApplicationBootstrap = require("./PaymentApplicationBootstrap");
const ProviderFoundationWebhookHandler = require("../webhooks/ProviderFoundationWebhookHandler");

/**
 * Dependency injection bootstrap for payment runtime.
 */
class DependencyInjectionBootstrap {
  static create(options = {}) {
    const PaymentModule = require("../../PaymentModule");
    const config = new RuntimeConfig(options.config || {});

    let paymentFoundation = options.paymentFoundation || null;
    if (!paymentFoundation && config.composePaymentFoundation) {
      paymentFoundation = PaymentApplicationBootstrap.composeFoundation({
        foundationOptions: options.paymentFoundationOptions,
        applyFeatureFlagRollout: config.applyFeatureFlagRollout,
        env: options.env,
      });
    }

    const paymentModuleOptions = PaymentApplicationBootstrap.resolvePaymentModuleOptions({
      paymentFoundation,
      composePaymentFoundation: false,
      paymentModuleOptions: options.paymentModuleOptions,
    });

    const logger = new Logger({ serviceName: config.serviceName, level: config.logLevel });
    const paymentModule = options.paymentModule || new PaymentModule(paymentModuleOptions);
    const facade = paymentModule.getMarketplacePaymentFacade();
    const apiLayer = createPaymentApi(paymentModule);
    const jobScheduler = new JobScheduler({ logger: logger.child({ component: "jobs" }) });
    const webhookRegistry = new WebhookRegistry();

    if (paymentModule.getWebhookVerificationService()) {
      for (const providerCode of ["MTN_MOMO", "PAYPACK"]) {
        webhookRegistry.register(
          providerCode,
          new ProviderFoundationWebhookHandler({
            providerCode,
            webhookService: paymentModule.getWebhookVerificationService(),
          })
        );
      }
    }

    const shutdown = new GracefulShutdown({
      logger: logger.child({ component: "shutdown" }),
      timeoutMs: config.shutdownTimeoutMs,
    });

    const runtime = {
      config,
      logger,
      paymentModule,
      paymentFoundation,
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
