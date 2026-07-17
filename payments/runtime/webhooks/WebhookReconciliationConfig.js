const IdempotencyConfig = require("../../infrastructure/idempotency/IdempotencyConfig");

/**
 * Sprint 3 webhook reconciliation configuration defaults.
 */
const WebhookReconciliationConfig = Object.freeze({
  idempotencyScope: "webhook_reconciliation",
  defaultTtlSeconds: IdempotencyConfig.defaultTtlSeconds,
  webhookReplayWindowSeconds: 60 * 60 * 72,
  webhookFutureSkewSeconds: 60 * 5,
  envKeys: Object.freeze({
    PAYMENT_WEBHOOK_RECONCILIATION: "enableWebhookReconciliation",
    PAYMENT_WEBHOOK_SETTLEMENT: "enableWebhookSettlement",
    PAYMENT_LEGACY_ROUTING_POLICY: "enableLegacyRoutingPolicy",
  }),
});

module.exports = WebhookReconciliationConfig;
