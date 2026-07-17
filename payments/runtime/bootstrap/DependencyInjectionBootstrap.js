const { createPaymentApi } = require("../../api");
const { RuntimeConfig } = require("../config");
const { Logger } = require("../logging");
const { JobScheduler } = require("../jobs");
const { WebhookRegistry } = require("../webhooks");
const { GracefulShutdown } = require("../shutdown");
const { StartupDiagnostics, ProductionReadinessCheck } = require("../diagnostics");
const PaymentApplicationBootstrap = require("./PaymentApplicationBootstrap");
const ProviderFoundationWebhookHandler = require("../webhooks/ProviderFoundationWebhookHandler");
const { WebhookReconciliationBootstrap } = require("./WebhookReconciliationBootstrap");
const LegacyPaymentRoutingPolicy = require("../migration/LegacyPaymentRoutingPolicy");
const { TransactionLinkRepository, TransactionLinkService } = require("../linking");
const PaymentChargeRouter = require("../charging/PaymentChargeRouter");

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

    const legacyRoutingPolicy = new LegacyPaymentRoutingPolicy({
      enabled: config.enableLegacyRoutingPolicy === true,
    });

    const paymentModuleOptions = PaymentApplicationBootstrap.resolvePaymentModuleOptions({
      paymentFoundation,
      composePaymentFoundation: false,
      paymentModuleOptions: {
        ...(options.paymentModuleOptions || {}),
        legacyRoutingPolicy,
      },
    });

    const logger = new Logger({ serviceName: config.serviceName, level: config.logLevel });
    const paymentModule = options.paymentModule || new PaymentModule(paymentModuleOptions);

    let transactionLinkService = null;
    if (paymentFoundation?.engine) {
      const linkRepository =
        options.transactionLinkRepository || new TransactionLinkRepository();
      transactionLinkService = new TransactionLinkService({ repository: linkRepository });
      paymentModule.configureChargeInfrastructure({
        transactionLinkService,
        paymentChargeRouter: new PaymentChargeRouter({
          paymentService: paymentModule.getPaymentService(),
          foundationBridge: paymentModule.getPaymentFoundationBridge(),
          routingPolicy: legacyRoutingPolicy,
          transactionService: paymentFoundation.engine.transactionService,
          transactionLinkService,
          logger: logger.child({ component: "payment-charge-router" }),
        }),
      });
    }

    const facade = paymentModule.getMarketplacePaymentFacade();
    const apiLayer = createPaymentApi(paymentModule);
    const jobScheduler = new JobScheduler({ logger: logger.child({ component: "jobs" }) });
    const webhookRegistry = new WebhookRegistry();

    let webhookReconciliation = null;
    if (paymentFoundation && paymentModule.getWebhookVerificationService()) {
      webhookReconciliation = WebhookReconciliationBootstrap.compose({
        paymentFoundation,
        config,
        logger: logger.child({ component: "webhook-reconciliation" }),
        options: {
          ...(options.webhookReconciliationOptions || {}),
          transactionLinkService,
        },
      });

      for (const providerCode of ["MTN_MOMO", "PAYPACK"]) {
        webhookRegistry.register(
          providerCode,
          new ProviderFoundationWebhookHandler({
            providerCode,
            webhookService: paymentModule.getWebhookVerificationService(),
            reconciliationOrchestrator: webhookReconciliation?.orchestrator || null,
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
      webhookReconciliation,
      legacyRoutingPolicy,
      transactionLinkService,
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
