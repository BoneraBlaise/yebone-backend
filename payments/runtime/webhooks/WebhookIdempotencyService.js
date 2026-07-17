const { createMongoIdempotencyLayer } = require("../../infrastructure/idempotency");
const WebhookIdempotencyKeyBuilder = require("./WebhookIdempotencyKeyBuilder");
const WebhookReconciliationConfig = require("./WebhookReconciliationConfig");
const WebhookReconciliationResult = require("./WebhookReconciliationResult");
const TransactionCorrelationPolicy = require("./TransactionCorrelationPolicy");
const InProgressRequestError = require("../../infrastructure/idempotency/errors/InProgressRequestError");

/**
 * Webhook-scoped idempotency — separate from charge idempotency scope.
 */
class WebhookIdempotencyService {
  constructor({ idempotencyService, scope = WebhookReconciliationConfig.idempotencyScope } = {}) {
    if (!idempotencyService) {
      throw new Error("WebhookIdempotencyService requires idempotencyService");
    }
    this.idempotencyService = idempotencyService;
    this.scope = scope;
  }

  static create(options = {}) {
    if (options.idempotencyService) {
      return new WebhookIdempotencyService({ idempotencyService: options.idempotencyService });
    }

    const layer = createMongoIdempotencyLayer({
      repository: options.repository,
      scope: WebhookReconciliationConfig.idempotencyScope,
      ttlSeconds: options.ttlSeconds || WebhookReconciliationConfig.defaultTtlSeconds,
    });

    return new WebhookIdempotencyService({ idempotencyService: layer.service });
  }

  buildKey(input = {}) {
    return WebhookIdempotencyKeyBuilder.build(input);
  }

  async executeOnce(input = {}, handler) {
    const correlationChain = TransactionCorrelationPolicy.fromWebhookInput(input);
    const key = this.buildKey({
      providerCode: input.providerCode,
      providerEventId: correlationChain.providerEventId,
      providerReference: correlationChain.providerReference,
      eventType: input.eventType,
      payloadMaterial: input.payloadMaterial,
    });

    const payload = {
      providerCode: input.providerCode,
      providerEventId: correlationChain.providerEventId,
      providerReference: correlationChain.providerReference,
      correlationId: correlationChain.correlationId,
      payloadMaterial: input.payloadMaterial,
    };

    try {
      const raw = await this.idempotencyService.execute(
        key,
        payload,
        handler,
        TransactionCorrelationPolicy.toIdempotencyMetadata(correlationChain)
      );

      if (raw && raw.replayed === true && raw.result) {
        return WebhookReconciliationResult.duplicate({
          cached: WebhookIdempotencyService._unwrap(raw.result),
          correlationId: correlationChain.correlationId,
          executionMode: input.executionMode || null,
        });
      }

      return WebhookIdempotencyService._unwrap(raw?.result ?? raw);
    } catch (error) {
      if (error instanceof InProgressRequestError) {
        return WebhookReconciliationResult.create({
          accepted: false,
          verified: input.verified === true,
          duplicate: false,
          replay: false,
          reconciled: false,
          settlementExecuted: false,
          correlationId: correlationChain.correlationId,
          providerReference: correlationChain.providerReference,
          providerEventId: correlationChain.providerEventId,
          executionMode: input.executionMode || null,
          reason: "IN_PROGRESS",
        });
      }
      throw error;
    }
  }

  static wrapResult(result) {
    return Object.freeze({ __webhookReconciliationResult: result });
  }

  static _unwrap(result) {
    if (result && result.__webhookReconciliationResult) {
      return result.__webhookReconciliationResult;
    }
    return result;
  }
}

module.exports = WebhookIdempotencyService;
