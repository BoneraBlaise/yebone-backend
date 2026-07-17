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
    return this.webhookService.verifySignature({
      providerCode: this.providerCode,
      payload,
      headers,
    });
  }

  async handleEvent(event) {
    const verification = await this.webhookService.verifyWebhook({
      providerCode: this.providerCode,
      payload: event?.payload || event,
      headers: event?.headers || {},
      signature: event?.signature,
    });

    return Object.freeze({
      accepted: verification.verified === true,
      providerCode: this.providerCode,
      executionMode: verification.executionMode,
      status: verification.status,
      verification,
    });
  }
}

module.exports = ProviderFoundationWebhookHandler;
