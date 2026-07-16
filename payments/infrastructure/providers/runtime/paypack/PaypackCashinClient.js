const { randomUUID } = require("node:crypto");
const PaypackConfig = require("./PaypackConfig");
const ProviderIdempotencyContract = require("../../ProviderIdempotencyContract");
const ProviderReferenceContract = require("../../ProviderReferenceContract");

/**
 * Paypack cash-in / cash-out transaction client — sandbox architecture.
 */
class PaypackCashinClient {
  constructor({ authClient, httpClient, environmentResolver, verifyClient }) {
    this.authClient = authClient;
    this.httpClient = httpClient;
    this.environmentResolver = environmentResolver;
    this.verifyClient = verifyClient;
    this.providerCode = PaypackConfig.providerCode;
    this.idempotencyContract = new ProviderIdempotencyContract(this.providerCode);
    this.referenceContract = new ProviderReferenceContract(this.providerCode);
  }

  async cashIn(input = {}) {
    return this._createTransaction({
      input,
      operation: "cashin",
      path: PaypackConfig.sandbox.cashinPath,
      msisdn: input.payerMsisdn || input.msisdn || input.number,
    });
  }

  async cashOut(input = {}) {
    return this._createTransaction({
      input,
      operation: "cashout",
      path: PaypackConfig.sandbox.cashoutPath,
      msisdn: input.payeeMsisdn || input.msisdn || input.number,
    });
  }

  async verifyCashIn(referenceId) {
    return this.verifyClient.findTransaction(referenceId, { kind: "CASHIN" });
  }

  async _createTransaction({ input, operation, path, msisdn }) {
    const token = await this.authClient.acquireToken(PaypackConfig.scopes.default);
    const env = this.environmentResolver.resolve(this.providerCode);

    const idempotencyKey = this.idempotencyContract.buildKey({
      operation: operation === "cashout" ? "payout" : "charge",
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
    const url = `${env.baseUrl}${path}`;

    const response = await this.httpClient.request({
      providerCode: this.providerCode,
      operation,
      method: "POST",
      url,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token.accessToken}`,
        [PaypackConfig.sandbox.idempotencyHeader]: idempotencyKey.key,
      },
      body: {
        amount: Number(input.amount),
        number: msisdn,
      },
      correlationId,
      idempotencyKey: idempotencyKey.key,
      signing: {
        bearerToken: token.accessToken,
        idempotencyKey: idempotencyKey.key,
        correlationId,
      },
    });

    const body = typeof response.body === "string" ? JSON.parse(response.body) : response.body;

    return Object.freeze({
      status: response.status,
      correlationId,
      idempotencyKey: idempotencyKey.key,
      providerReference: body?.ref || idempotencyKey.key,
      merchantReference: references.merchantReference,
      transactionRef: body?.ref || null,
      sandbox: true,
      raw: body,
    });
  }
}

module.exports = PaypackCashinClient;
