const ProviderAdapterInterface = require("../../ProviderAdapterInterface");
const ProviderRequest = require("../../models/ProviderRequest");
const ProviderResponse = require("../../models/ProviderResponse");
const ProviderResponseNormalizer = require("../ProviderResponseNormalizer");
const ProviderWebhookVerifier = require("../ProviderWebhookVerifier");
const { applyRuntimeAdapterContractSurface } = require("../RuntimeAdapterContractSurface");
const PaypackErrorMapper = require("./PaypackErrorMapper");
const PaypackConfig = require("./PaypackConfig");
const PaypackRefundClient = require("./PaypackRefundClient");
const RuntimeConfig = require("../RuntimeConfig");

/**
 * Paypack runtime adapter — sandbox architecture, mock HTTP in tests only.
 */
class PaypackRuntimeAdapter {
  constructor({
    authClient,
    checkoutClient,
    cashinClient,
    verifyClient,
    refundClient,
    errorMapper,
    normalizer,
    webhookVerifier,
  }) {
    this.providerCode = PaypackConfig.providerCode;
    this.authClient = authClient;
    this.checkoutClient = checkoutClient;
    this.cashinClient = cashinClient;
    this.verifyClient = verifyClient;
    this.refundClient = refundClient || new PaypackRefundClient({ providerCode: PaypackConfig.providerCode });
    this.errorMapper = errorMapper || new PaypackErrorMapper();
    this.normalizer = normalizer || new ProviderResponseNormalizer(this.providerCode);
    this.webhookVerifier = webhookVerifier || new ProviderWebhookVerifier(this.providerCode);
    applyRuntimeAdapterContractSurface(this, this.providerCode);
  }

  async charge(input = {}) {
    return this._execute("charge", input, async (request) => {
      const useCheckout =
        request.metadata?.product === "checkout" || request.metadata?.useCheckout === true;

      const result = useCheckout
        ? await this.checkoutClient.checkout({
            reference: request.reference,
            amount: request.amount,
            currency: request.currency,
            email: request.metadata?.email,
            appId: request.metadata?.appId || request.metadata?.applicationId,
            items: request.metadata?.items,
            itemName: request.metadata?.itemName,
          })
        : await this.cashinClient.cashIn({
            reference: request.reference,
            amount: request.amount,
            currency: request.currency,
            msisdn: request.metadata?.msisdn || request.payload?.msisdn,
          });

      return this.normalizer.normalizeCharge({
        success: true,
        mock: false,
        status: useCheckout ? "PENDING" : "PENDING",
        reference: request.reference,
        providerReference: result.providerReference || result.transactionRef,
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
        request.metadata?.providerReference ||
        request.metadata?.transactionRef ||
        request.metadata?.idempotencyKey ||
        request.reference;

      const result = await this.verifyClient.findTransaction(referenceId, {
        kind: request.metadata?.kind,
      });

      return this.normalizer.normalizeVerify({
        success: true,
        mock: false,
        status: result.status,
        reference: request.reference,
        providerReference: result.providerReference,
        externalReference: result.financialTransactionId,
        amount: result.amount,
        kind: result.kind,
        sandbox: true,
        raw: result,
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
      const result = await this.cashinClient.cashOut({
        reference: request.reference,
        amount: request.amount,
        currency: request.currency,
        msisdn: request.metadata?.msisdn || request.payload?.msisdn,
      });

      return this.normalizer.normalizePayout({
        success: true,
        mock: false,
        status: "PENDING",
        reference: request.reference,
        providerReference: result.providerReference || result.transactionRef,
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
    return ProviderAdapterInterface.assertImplementation(adapter, PaypackConfig.providerCode);
  }
}

module.exports = PaypackRuntimeAdapter;
