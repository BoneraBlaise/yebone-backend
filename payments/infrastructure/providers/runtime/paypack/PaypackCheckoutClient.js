const { randomUUID } = require("node:crypto");
const PaypackConfig = require("./PaypackConfig");
const ProviderIdempotencyContract = require("../../ProviderIdempotencyContract");
const ProviderReferenceContract = require("../../ProviderReferenceContract");

/**
 * Paypack checkout session client — sandbox architecture.
 */
class PaypackCheckoutClient {
  constructor({ authClient, httpClient, environmentResolver }) {
    this.authClient = authClient;
    this.httpClient = httpClient;
    this.environmentResolver = environmentResolver;
    this.providerCode = PaypackConfig.providerCode;
    this.idempotencyContract = new ProviderIdempotencyContract(this.providerCode);
    this.referenceContract = new ProviderReferenceContract(this.providerCode);
  }

  async checkout(input = {}) {
    const token = await this.authClient.acquireToken(PaypackConfig.scopes.checkout, {
      metrics: input.metrics,
      correlationId: input.correlationId,
    });
    this.environmentResolver.resolve(this.providerCode);

    const idempotencyKey = this.idempotencyContract.buildKey({
      operation: "charge",
      reference: input.reference,
      providerCode: this.providerCode,
      amount: input.amount,
      currency: input.currency,
    });

    const references = this.referenceContract.buildReference({
      reference: input.reference,
      providerCode: this.providerCode,
    });

    const correlationId = input.correlationId || randomUUID();
    const url = `${PaypackConfig.sandbox.checkoutBaseUrl}${PaypackConfig.sandbox.checkoutInitiatePath}`;

    const response = await this.httpClient.request({
      providerCode: this.providerCode,
      operation: "checkout",
      method: "POST",
      url,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token.accessToken}`,
        [PaypackConfig.sandbox.idempotencyHeader]: idempotencyKey.key,
      },
      body: {
        app_id: input.appId || input.applicationId,
        email: input.email,
        items: input.items || [
          {
            name: input.itemName || "Payment",
            amount: Number(input.amount),
            quantity: 1,
          },
        ],
      },
      correlationId,
      idempotencyKey: idempotencyKey.key,
      signing: {
        bearerToken: token.accessToken,
        idempotencyKey: idempotencyKey.key,
        correlationId,
      },
      metrics: input.metrics,
    });

    const body = typeof response.body === "string" ? JSON.parse(response.body) : response.body;

    return Object.freeze({
      status: response.status,
      correlationId,
      idempotencyKey: idempotencyKey.key,
      providerReference: body?.session_id || references.providerReference,
      merchantReference: references.merchantReference,
      paymentLink: body?.payment_link || null,
      sessionId: body?.session_id || null,
      sandbox: true,
      raw: body,
    });
  }
}

module.exports = PaypackCheckoutClient;
