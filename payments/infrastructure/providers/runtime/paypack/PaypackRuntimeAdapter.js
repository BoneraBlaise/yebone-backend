const ProviderAdapterInterface = require("../../ProviderAdapterInterface");
const ProviderRequest = require("../../models/ProviderRequest");
const ProviderResponse = require("../../models/ProviderResponse");
const ProviderResponseNormalizer = require("../ProviderResponseNormalizer");
const ProviderWebhookVerifier = require("../ProviderWebhookVerifier");
const { applyRuntimeAdapterContractSurface } = require("../RuntimeAdapterContractSurface");
const PaypackErrorMapper = require("./PaypackErrorMapper");
const PaypackConfig = require("./PaypackConfig");
const RuntimeConfig = require("../RuntimeConfig");

/**
 * Paypack runtime adapter — authentication and normalization architecture only.
 */
class PaypackRuntimeAdapter {
  constructor({ authClient, errorMapper, normalizer, webhookVerifier }) {
    this.providerCode = PaypackConfig.providerCode;
    this.authClient = authClient;
    this.errorMapper = errorMapper || new PaypackErrorMapper();
    this.normalizer = normalizer || new ProviderResponseNormalizer(this.providerCode);
    this.webhookVerifier = webhookVerifier || new ProviderWebhookVerifier(this.providerCode);
    applyRuntimeAdapterContractSurface(this, this.providerCode);
  }

  async charge(input = {}) {
    return this._execute("charge", input, async (request) => {
      await this.authClient.acquireToken();
      const references = this.providerReference.buildReference({
        reference: request.reference,
        providerCode: this.providerCode,
      });
      const idempotencyKey = this.providerIdempotency.buildKey({
        operation: "charge",
        reference: request.reference,
        providerCode: this.providerCode,
      });

      return this.normalizer.normalizeCharge({
        success: true,
        mock: false,
        status: "AUTH_READY",
        reference: request.reference,
        providerReference: references.providerReference,
        merchantReference: references.merchantReference,
        amount: request.amount,
        currency: request.currency,
        idempotencyKey: idempotencyKey.key,
        sandbox: true,
        raw: { authenticated: true, productionCallsBlocked: true },
      });
    });
  }

  async verify(input = {}) {
    return this._execute("verify", input, async () =>
      ProviderResponse.fromResult({
        success: true,
        mock: false,
        providerCode: this.providerCode,
        operation: "verify",
        status: "NOT_IMPLEMENTED_PHASE1",
        metadata: { sandbox: true },
      })
    );
  }

  async refund() {
    return ProviderResponse.failure(
      this.errorMapper.map(new Error("Paypack refund not implemented in Phase 1"), {
        providerCode: this.providerCode,
        operation: "refund",
      })
    );
  }

  async payout() {
    return ProviderResponse.failure(
      this.errorMapper.map(new Error("Paypack payout not implemented in Phase 1"), {
        providerCode: this.providerCode,
        operation: "payout",
      })
    );
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
