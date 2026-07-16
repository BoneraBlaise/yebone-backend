const { randomUUID } = require("node:crypto");
const MTNMoMoConfig = require("./MTNMoMoConfig");
const ProviderIdempotencyContract = require("../../ProviderIdempotencyContract");
const ProviderReferenceContract = require("../../ProviderReferenceContract");

/**
 * MTN MoMo Collection (requestToPay) client — sandbox architecture.
 */
class MTNMoMoCollectionClient {
  constructor({ oauthClient, httpClient, environmentResolver }) {
    this.oauthClient = oauthClient;
    this.httpClient = httpClient;
    this.environmentResolver = environmentResolver;
    this.providerCode = MTNMoMoConfig.providerCode;
    this.idempotencyContract = new ProviderIdempotencyContract(this.providerCode);
    this.referenceContract = new ProviderReferenceContract(this.providerCode);
  }

  async requestToPay(input = {}) {
    const credentialResult = await this.oauthClient.credentialStore.load(this.providerCode, {
      required: true,
    });
    const { subscriptionKey, targetEnvironment } = credentialResult.credentials;

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

    const token = await this.oauthClient.acquireToken(MTNMoMoConfig.scopes.collection);
    const env = this.environmentResolver.resolve(this.providerCode);
    const correlationId = input.correlationId || randomUUID();
    const url = `${env.baseUrl}${MTNMoMoConfig.sandbox.collectionPath}`;

    const response = await this.httpClient.request({
      providerCode: this.providerCode,
      operation: "collection",
      method: "POST",
      url,
      headers: {
        "Content-Type": "application/json",
        [MTNMoMoConfig.sandbox.targetEnvironmentHeader]: targetEnvironment || "sandbox",
      },
      body: {
        amount: String(input.amount),
        currency: input.currency || "RWF",
        externalId: references.merchantReference || input.reference,
        payer: {
          partyIdType: "MSISDN",
          partyId: input.payerMsisdn || input.msisdn,
        },
        payerMessage: input.payerMessage || "Payment",
        payeeNote: input.payeeNote || "Collection",
      },
      correlationId,
      idempotencyKey: idempotencyKey.key,
      signing: {
        subscriptionKey,
        bearerToken: token.accessToken,
        idempotencyKey: idempotencyKey.key,
        correlationId,
      },
    });

    return Object.freeze({
      status: response.status,
      correlationId,
      idempotencyKey: idempotencyKey.key,
      providerReference: references.providerReference,
      merchantReference: references.merchantReference,
      sandbox: true,
      raw: response.body,
    });
  }

  async getStatus(referenceId) {
    const credentialResult = await this.oauthClient.credentialStore.load(this.providerCode, {
      required: true,
    });
    const { subscriptionKey, targetEnvironment } = credentialResult.credentials;
    const token = await this.oauthClient.acquireToken(MTNMoMoConfig.scopes.collection);
    const env = this.environmentResolver.resolve(this.providerCode);
    const url = `${env.baseUrl}${MTNMoMoConfig.sandbox.collectionStatusPath}/${referenceId}`;

    const response = await this.httpClient.request({
      providerCode: this.providerCode,
      operation: "collection_status",
      method: "GET",
      url,
      headers: {
        [MTNMoMoConfig.sandbox.targetEnvironmentHeader]: targetEnvironment || "sandbox",
      },
      signing: {
        subscriptionKey,
        bearerToken: token.accessToken,
        correlationId: randomUUID(),
      },
    });

    const body = typeof response.body === "string" ? JSON.parse(response.body) : response.body;
    return Object.freeze({
      status: body?.status || "UNKNOWN",
      financialTransactionId: body?.financialTransactionId || null,
      sandbox: true,
      raw: body,
    });
  }
}

module.exports = MTNMoMoCollectionClient;
