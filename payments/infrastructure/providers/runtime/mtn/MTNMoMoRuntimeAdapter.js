const ProviderAdapterInterface = require("../../ProviderAdapterInterface");
const ProviderRequest = require("../../models/ProviderRequest");
const ProviderResponse = require("../../models/ProviderResponse");
const ProviderResponseNormalizer = require("../ProviderResponseNormalizer");
const ProviderWebhookVerifier = require("../ProviderWebhookVerifier");
const { applyRuntimeAdapterContractSurface } = require("../RuntimeAdapterContractSurface");
const MTNMoMoErrorMapper = require("./MTNMoMoErrorMapper");
const MTNMoMoConfig = require("./MTNMoMoConfig");
const MTNMoMoRefundClient = require("./MTNMoMoRefundClient");
const RuntimeConfig = require("../RuntimeConfig");

/**
 * MTN MoMo runtime adapter — sandbox architecture, mock HTTP in tests only.
 * Separate from Module 9 MTNMoMoAdapter skeleton.
 */
class MTNMoMoRuntimeAdapter {
  constructor({
    collectionClient,
    disbursementClient,
    oauthClient,
    apiUserService,
    refundClient,
    errorMapper,
    normalizer,
    webhookVerifier,
  }) {
    this.providerCode = MTNMoMoConfig.providerCode;
    this.collectionClient = collectionClient;
    this.disbursementClient = disbursementClient;
    this.oauthClient = oauthClient;
    this.apiUserService = apiUserService;
    this.refundClient = refundClient || new MTNMoMoRefundClient({ providerCode: MTNMoMoConfig.providerCode });
    this.errorMapper = errorMapper || new MTNMoMoErrorMapper();
    this.normalizer = normalizer || new ProviderResponseNormalizer(this.providerCode);
    this.webhookVerifier = webhookVerifier || new ProviderWebhookVerifier(this.providerCode);
    applyRuntimeAdapterContractSurface(this, this.providerCode);
  }

  async charge(input = {}) {
    return this._execute("charge", input, async (request) => {
      const result = await this.collectionClient.requestToPay({
        reference: request.reference,
        amount: request.amount,
        currency: request.currency,
        payerMsisdn: request.metadata?.msisdn || request.payload?.msisdn,
      });
      return this.normalizer.normalizeCharge({
        success: true,
        mock: false,
        status: "PENDING",
        reference: request.reference,
        providerReference: result.idempotencyKey,
        merchantReference: result.merchantReference,
        amount: request.amount,
        currency: request.currency,
        correlationId: result.correlationId,
        idempotencyKey: result.idempotencyKey,
        sandbox: true,
        raw: result,
      });
    });
  }

  async verify(input = {}) {
    return this._execute("verify", input, async (request) => {
      const referenceId =
        request.metadata?.idempotencyKey ||
        request.metadata?.providerReference ||
        request.reference;
      const isDisbursement =
        request.metadata?.product === "disbursement" || request.metadata?.operation === "payout";

      const result = isDisbursement
        ? await this.disbursementClient.getStatus(referenceId)
        : await this.collectionClient.getStatus(referenceId);

      return ProviderResponse.fromResult({
        success: true,
        mock: false,
        providerCode: this.providerCode,
        operation: "verify",
        status: result.status,
        externalReference: result.financialTransactionId,
        metadata: Object.freeze({ sandbox: true, product: isDisbursement ? "disbursement" : "collection" }),
        data: result.raw,
      });
    });
  }

  async refund(input = {}) {
    return this._execute("refund", input, async () => {
      await this.refundClient.refund();
      return ProviderResponse.fromResult({
        success: false,
        mock: false,
        providerCode: this.providerCode,
        operation: "refund",
        status: "NOT_IMPLEMENTED",
      });
    });
  }

  async payout(input = {}) {
    return this._execute("payout", input, async (request) => {
      const result = await this.disbursementClient.transfer({
        reference: request.reference,
        amount: request.amount,
        currency: request.currency,
        payeeMsisdn: request.metadata?.msisdn || request.payload?.msisdn,
      });
      return this.normalizer.normalizePayout({
        success: true,
        mock: false,
        status: "PENDING",
        reference: request.reference,
        providerReference: result.idempotencyKey,
        merchantReference: result.merchantReference,
        amount: request.amount,
        currency: request.currency,
        correlationId: result.correlationId,
        idempotencyKey: result.idempotencyKey,
        sandbox: true,
        raw: result,
      });
    });
  }

  async webhook(input = {}) {
    const verification = this.webhookVerifier.verifyWebhook({
      ...input,
      providerCode: this.providerCode,
    });
    return ProviderResponse.fromResult({
      success: verification.verified,
      mock: false,
      providerCode: this.providerCode,
      operation: "webhook",
      status: verification.status,
      metadata: Object.freeze({ verification }),
    });
  }

  health() {
    return Object.freeze({
      providerCode: this.providerCode,
      status: "RUNTIME_SANDBOX",
      executable: false,
      runtimeVersion: RuntimeConfig.version,
      liveExecutionEnabled: RuntimeConfig.liveExecutionEnabled,
      sandbox: true,
    });
  }

  async verifyWebhook(input = {}) {
    return this.webhookVerifier.verifyWebhook({ ...input, providerCode: this.providerCode });
  }

  async verifySignature(input = {}) {
    return this.webhookVerifier.verifySignature({ ...input, providerCode: this.providerCode });
  }

  async _execute(operation, input, handler) {
    const request = ProviderRequest.normalize({
      ...input,
      operation,
      providerCode: this.providerCode,
    });

    try {
      return await handler(request);
    } catch (error) {
      return ProviderResponse.failure(
        this.errorMapper.map(error, { providerCode: this.providerCode, operation })
      );
    }
  }

  static assertContract(adapter) {
    return ProviderAdapterInterface.assertImplementation(adapter, MTNMoMoConfig.providerCode);
  }
}

module.exports = MTNMoMoRuntimeAdapter;
