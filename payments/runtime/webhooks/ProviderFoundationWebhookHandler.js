const WebhookHandlerInterface = require("./WebhookHandlerInterface");
const WebhookReconciliationOrchestrator = require("./WebhookReconciliationOrchestrator");
const WebhookReconciliationResult = require("./WebhookReconciliationResult");
const TransactionCorrelationPolicy = require("./TransactionCorrelationPolicy");

/**
 * Webhook handler bridge — delegates to PaymentModuleWebhookService using Module 9 contracts.
 */
class ProviderFoundationWebhookHandler extends WebhookHandlerInterface {
  constructor({ providerCode, webhookService, reconciliationOrchestrator = null }) {
    super();
    this.providerCode = providerCode;
    this.webhookService = webhookService;
    this.reconciliationOrchestrator = reconciliationOrchestrator;
  }

  async verifySignature(payload, headers) {
    const envelope = ProviderFoundationWebhookHandler._normalizeEnvelope(payload, headers);
    return this.webhookService.verifySignature({
      providerCode: this.providerCode,
      payload: envelope.payload,
      headers: envelope.headers,
      signature: envelope.signature,
      correlationId: envelope.correlationId,
      rawPayload: envelope.payloadMaterial,
    });
  }

  async handleEvent(event) {
    const envelope = ProviderFoundationWebhookHandler._normalizeEnvelope(event, event?.headers);
    const verification = await this.webhookService.verifyWebhook({
      providerCode: this.providerCode,
      payload: envelope.payload,
      headers: envelope.headers,
      signature: envelope.signature,
      correlationId: envelope.correlationId,
      rawPayload: envelope.payloadMaterial,
    });

    if (!this.reconciliationOrchestrator) {
      const verified = WebhookReconciliationOrchestrator._isVerificationEligible(
        verification,
        verification.executionMode
      );
      return WebhookReconciliationResult.verifyOnly({
        verified,
        correlationId: envelope.correlationId,
        executionMode: verification.executionMode,
        providerCode: this.providerCode,
        mock: verification.mock === true,
        providerReference:
          verification.references?.providerReference ||
          envelope.payload?.reference ||
          null,
        providerEventId: envelope.payload?.eventId || envelope.payload?.id || null,
        reason: verification.verified ? "VERIFIED_ONLY" : verification.status,
      });
    }

    const result = await this.reconciliationOrchestrator.process({
      providerCode: this.providerCode,
      payload: envelope.payload,
      payloadMaterial: envelope.payloadMaterial,
      headers: envelope.headers,
      correlationId: envelope.correlationId,
      verification,
      executionMode: verification.executionMode,
    });

    TransactionCorrelationPolicy.enrich(
      TransactionCorrelationPolicy.fromWebhookInput({
        correlationId: envelope.correlationId,
        verification,
        payload: envelope.payload,
      }),
      {
        transactionId: result.transactionId,
        eventId: result.eventIds?.[0] || null,
        auditId: result.auditId,
        ledgerEntryId: result.ledgerEntryIds?.[0] || null,
      }
    );

    return result;
  }

  static _normalizeEnvelope(input, headers = {}) {
    if (input && typeof input === "object" && "payload" in input) {
      return {
        payload: input.payload,
        payloadMaterial: input.payloadMaterial || input.rawPayload || null,
        headers: input.headers || headers,
        signature: input.signature || null,
        correlationId: input.correlationId || null,
      };
    }

    return {
      payload: input,
      payloadMaterial: null,
      headers,
      signature: null,
      correlationId: null,
    };
  }
}

module.exports = ProviderFoundationWebhookHandler;
