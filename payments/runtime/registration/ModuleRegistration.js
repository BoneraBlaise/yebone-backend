const ApiVersionRegistration = require("./ApiVersionRegistration");
const MiddlewareRegistration = require("./MiddlewareRegistration");
const RouteRegistration = require("./RouteRegistration");
const { WebhookRouter } = require("../webhooks");

/**
 * Module registration layer — wires payment runtime into Express.
 */
class ModuleRegistration {
  static register(app, runtime) {
    const {
      config,
      logger,
      apiLayer,
      startupDiagnostics,
      productionReadiness,
      shutdown,
      jobScheduler,
      webhookRegistry,
    } = runtime;

    if (!config.enablePaymentRoutes) {
      logger.warn("Payment route registration disabled by config");
      return { registered: false };
    }

    ApiVersionRegistration.register(app, { logger });
    const middlewareStack = MiddlewareRegistration.registerGlobal(app, apiLayer.middleware, config, logger);

    const webhookHandlers = webhookRegistry.list();
    const webhookRoutesEnabled =
      config.enableWebhooks === true && webhookHandlers.length > 0;

    const webhookRouter = webhookRoutesEnabled
      ? new WebhookRouter({ registry: webhookRegistry, logger, config })
      : null;

    if (config.enableWebhooks && webhookHandlers.length === 0) {
      logger.warn("Webhook routes disabled — no handlers registered (compose foundation first)", {
        composePaymentFoundation: config.composePaymentFoundation,
      });
    }

    const router = RouteRegistration.register(app, {
      apiLayer,
      middlewareStack,
      apiMiddleware: apiLayer.middleware,
      logger,
      webhookRouter,
      config,
    });

    shutdown.onShutdown("payment-runtime", async () => {
      logger.info("Payment runtime shutdown hook executed");
    });

    if (config.isProduction()) {
      shutdown.register();
    }

    const startup = startupDiagnostics.run();
    const readiness = productionReadiness.run();

    app.locals.paymentRuntime = {
      facade: runtime.facade,
      startup,
      readiness,
      jobs: jobScheduler.list(),
      webhooks: webhookRegistry.list(),
    };

    logger.info("Payment module registered", {
      healthy: startup.healthy && readiness.healthy,
      routes: apiLayer.routeDefinitions.length,
    });

    return {
      registered: true,
      router,
      startup,
      readiness,
    };
  }
}

module.exports = ModuleRegistration;
