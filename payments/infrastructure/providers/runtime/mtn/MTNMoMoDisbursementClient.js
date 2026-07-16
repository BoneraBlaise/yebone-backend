const { randomUUID } = require("node:crypto");
const MTNMoMoConfig = require("./MTNMoMoConfig");
const ProviderIdempotencyContract = require("../../ProviderIdempotencyContract");
const ProviderReferenceContract = require("../../ProviderReferenceContract");

/**
 * MTN MoMo Disbursement (transfer) client — sandbox architecture.
 */
class MTNMoMoDisbursementClient {
  constructor({ oauthClient, httpClient, environmentResolver }) {
    this.oauthClient = oauthClient;
    this.httpClient = httpClient;
    this.environmentResolver = environmentResolver;
    this.providerCode = MTNMoMoConfig.providerCode;
    this.idempotencyContract = new ProviderIdempotencyContract(this.providerCode);
    this.referenceContract = new ProviderReferenceContract(this.providerCode);
  }

  async transfer(input = {}) {
    const credentialResult = await this.oauthClient.credentialStore.load(this.providerCode, {
      required: true,
    });
    const { subscriptionKey, targetEnvironment } = credentialResult.credentials;

    const idempotencyKey = this.idempotencyContract.buildKey({
      operation: "payout",
      reference: input.reference,
      providerCode: this.providerCode,
      amount: input.amount,
      currency: input.currency,
    });

    const references = this.referenceContract.buildReference({
      reference: input.reference,
      providerCode: this.providerCode,
    });

    const token = await this.oauthClient.acquireToken(MTNMoMoConfig.scopes.disbursement);
    const env = this.environmentResolver.resolve(this.providerCode);
    const correlationId = input.correlationId || randomUUID();
    const url = `${env.baseUrl}${MTNMoMoConfig.sandbox.disbursementPath}`;

    const response = await this.httpClient.request({
      providerCode: this.providerCode,
      operation: "disbursement",
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
        payee: {
          partyIdType: "MSISDN",
          partyId: input.payeeMsisdn || input.msisdn,
        },
        payerMessage: input.payerMessage || "Disbursement",
        payeeNote: input.payeeNote || "Payout",
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
}

module.exports = MTNMoMoDisbursementClient;
