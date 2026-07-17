const WebhookHandlerInterface = require("../webhooks/WebhookHandlerInterface");

/**
 * Webhook handler bridge — delegates to PaymentModuleWebhookService using Module 9 contracts.
 */
class ProviderFoundationWebhookHandler extends WebhookHandlerInterface {
  constructor({ providerCode, webhookService }) {
    super();
    this.providerCode = providerCode;
    this.webhookService = webhookService;
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

    return Object.freeze({
      accepted: verification.verified === true,
      providerCode: this.providerCode,
      executionMode: verification.executionMode,
      status: verification.status,
      correlationId: envelope.correlationId,
      verification,
    });
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
