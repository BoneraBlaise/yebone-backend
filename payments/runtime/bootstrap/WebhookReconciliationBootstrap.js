const createIntegrationFoundation = require("../../infrastructure/integration/IntegrationFactory");
const { createEventBus } = require("../../infrastructure/events");
const WebhookIdempotencyService = require("../webhooks/WebhookIdempotencyService");
const WebhookEventPublisher = require("../webhooks/WebhookEventPublisher");
const WebhookSettlementBridge = require("../webhooks/WebhookSettlementBridge");
const WebhookReconciliationOrchestrator = require("../webhooks/WebhookReconciliationOrchestrator");
const WebhookReplayGuard = require("../webhooks/WebhookReplayGuard");
const WebhookReconciliationConfig = require("../webhooks/WebhookReconciliationConfig");

/**
 * Wires Sprint 3 webhook reconciliation services without modifying PaymentFoundationBootstrap.
 */
class WebhookReconciliationBootstrap {
  static compose({ paymentFoundation, config, logger, options = {} }) {
    if (!paymentFoundation?.engine) {
      return null;
    }

    const engine = paymentFoundation.engine;
    const webhookIdempotency = WebhookIdempotencyService.create({
      repository: options.webhookIdempotencyRepository,
      idempotencyService: options.webhookIdempotencyService,
    });

    const events = options.eventBus
      ? { bus: options.eventBus }
      : createEventBus({ autoDispatch: false });

    const eventPublisher = new WebhookEventPublisher({
      eventBus: events.bus,
      auditService: engine.auditService,
    });

    let settlementBridge = null;
    if (config.enableWebhookSettlement === true) {
      engine.featureFlags.enable("paymentEngineEnabled");
      const integration = createIntegrationFoundation({
        bootstrap: {
          engine,
          idempotencyService: engine.idempotencyService,
          transactionService: engine.transactionService,
          auditService: engine.auditService,
          featureFlags: paymentFoundation.featureFlags,
        },
        eventBus: events.bus,
      });
      settlementBridge = new WebhookSettlementBridge({
        pipeline: integration.pipeline,
        logger,
      });
    }

    const orchestrator = new WebhookReconciliationOrchestrator({
      transactionService: engine.transactionService,
      transactionLinkService: options.transactionLinkService || null,
      webhookIdempotencyService: webhookIdempotency,
      eventPublisher,
      settlementBridge,
      replayGuard: new WebhookReplayGuard(),
      logger,
      config: {
        enableWebhookReconciliation: config.enableWebhookReconciliation === true,
        enableWebhookSettlement: config.enableWebhookSettlement === true,
      },
    });

    return Object.freeze({
      orchestrator,
      webhookIdempotency,
      eventPublisher,
      settlementBridge,
      eventBus: events.bus,
    });
  }
}

module.exports = {
  WebhookReconciliationBootstrap,
  WebhookReconciliationConfig,
};
