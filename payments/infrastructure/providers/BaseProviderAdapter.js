const ProviderRequest = require("./models/ProviderRequest");
const ProviderResponse = require("./models/ProviderResponse");
const ProviderAdapterInterface = require("./ProviderAdapterInterface");
const { ProviderOperation } = require("./ProviderOperation");
const {
  ProviderAdapterHealthContract,
} = require("./ProviderAdapterHealthContract");
const WebhookVerificationContract = require("./WebhookVerificationContract");
const ProviderIdempotencyContract = require("./ProviderIdempotencyContract");
const ProviderReferenceContract = require("./ProviderReferenceContract");
const ProviderCurrencyNotSupportedError = require("./errors/ProviderCurrencyNotSupportedError");
const ProviderCountryNotSupportedError = require("./errors/ProviderCountryNotSupportedError");

/**
 * Base skeleton adapter — mock responses only, gated by feature flags.
 */
class BaseProviderAdapter {
  constructor({
    providerCode,
    featureGate,
    capabilityValidator,
    registry,
    featureFlags,
    config = {},
  }) {
    if (!providerCode) {
      throw new Error("BaseProviderAdapter requires providerCode");
    }
    if (!featureGate) {
      throw new Error("BaseProviderAdapter requires featureGate");
    }
    if (!capabilityValidator) {
      throw new Error("BaseProviderAdapter requires capabilityValidator");
    }

    this.providerCode = String(providerCode).trim().toUpperCase();
    this.featureGate = featureGate;
    this.capabilityValidator = capabilityValidator;
    this.registry = registry;
    this.featureFlags = featureFlags;
    this.config = Object.freeze({ ...config });
    this.providerIdempotency = new ProviderIdempotencyContract(this.providerCode);
    this.providerReference = new ProviderReferenceContract(this.providerCode);
  }

  async charge(input = {}) {
    return this._execute(ProviderOperation.CHARGE, input, (request) =>
      this._mockOperation(ProviderOperation.CHARGE, request)
    );
  }

  async verify(input = {}) {
    return this._execute(ProviderOperation.VERIFY, input, (request) =>
      this._mockOperation(ProviderOperation.VERIFY, request, { status: "MOCK_VERIFIED" })
    );
  }

  async refund(input = {}) {
    return this._execute(ProviderOperation.REFUND, input, (request) =>
      this._mockOperation(ProviderOperation.REFUND, request, { status: "MOCK_REFUNDED" })
    );
  }

  async payout(input = {}) {
    return this._execute(ProviderOperation.PAYOUT, input, (request) =>
      this._mockOperation(ProviderOperation.PAYOUT, request, { status: "MOCK_PAYOUT_PENDING" })
    );
  }

  async webhook(input = {}) {
    return this._execute(ProviderOperation.WEBHOOK, input, (request) =>
      this._mockOperation(ProviderOperation.WEBHOOK, request, {
        status: "MOCK_WEBHOOK_ACCEPTED",
        metadata: { verified: true, mock: true },
      })
    );
  }

  health() {
    return ProviderAdapterHealthContract.build({
      registry: this.registry,
      featureFlags: this.featureFlags,
      providerCode: this.providerCode,
    });
  }

  /**
   * Webhook verification — mock only; cryptography deferred to Module 10.
   * Not gated by feature flags to allow future inbound webhook wiring.
   */
  async verifyWebhook(input = {}) {
    return WebhookVerificationContract.mockVerifyWebhook({
      ...input,
      providerCode: input.providerCode || this.providerCode,
    });
  }

  async verifySignature(input = {}) {
    return WebhookVerificationContract.mockVerifySignature({
      ...input,
      providerCode: input.providerCode || this.providerCode,
    });
  }

  buildProviderIdempotencyKey(input = {}) {
    return this.providerIdempotency.buildKey(input);
  }

  validateProviderIdempotencyKey(keyInput) {
    return this.providerIdempotency.validateKey(keyInput);
  }

  supportsProviderIdempotency() {
    return this.providerIdempotency.supportsProviderIdempotency();
  }

  buildProviderIdempotencyMetadata(input = {}) {
    return this.providerIdempotency.buildOptionalMetadata(input);
  }

  buildProviderReference(input = {}) {
    return this.providerReference.buildReference(input);
  }

  validateProviderReference(referenceInput) {
    return this.providerReference.validateReference(referenceInput);
  }

  buildProviderReferenceMetadata(input = {}) {
    return this.providerReference.buildOptionalMetadata(input);
  }

  async _execute(operation, input, handler) {
    const request = ProviderRequest.normalize({
      ...input,
      operation,
      providerCode: input.providerCode || this.providerCode,
    });

    const descriptor = this.featureGate.assertExecutable(this.providerCode);
    this.capabilityValidator.validate(descriptor, operation);
    this._assertRequestConstraints(descriptor, request);

    const result = await handler(request);
    return ProviderResponse.fromResult(result);
  }

  _assertRequestConstraints(descriptor, request) {
    if (request.providerCode && request.providerCode !== this.providerCode) {
      throw new Error(
        `Adapter ${this.providerCode} cannot execute request for ${request.providerCode}`
      );
    }

    if (
      request.country &&
      descriptor.supportedCountries.length > 0 &&
      !descriptor.supportedCountries.includes(request.country)
    ) {
      throw new ProviderCountryNotSupportedError(this.providerCode, request.country);
    }

    if (
      request.currency &&
      descriptor.supportedCurrencies.length > 0 &&
      !descriptor.supportedCurrencies.includes(request.currency)
    ) {
      throw new ProviderCurrencyNotSupportedError(this.providerCode, request.currency);
    }

    if (
      request.paymentMethod &&
      descriptor.supportedMethods.length > 0 &&
      !descriptor.supportedMethods.includes(request.paymentMethod)
    ) {
      throw new Error(
        `Provider ${this.providerCode} does not support payment method ${request.paymentMethod}`
      );
    }
  }

  _mockOperation(operation, request, overrides = {}) {
    return ProviderResponse.mock({
      providerCode: this.providerCode,
      operation,
      reference: request.reference,
      amount: request.amount,
      currency: request.currency,
      metadata: {
        adapter: this.constructor.name,
        country: request.country,
        paymentMethod: request.paymentMethod,
        ...(overrides.metadata || {}),
      },
      status: overrides.status,
      externalReference: overrides.externalReference,
    });
  }

  static assertContract(adapter, providerCode) {
    return ProviderAdapterInterface.assertImplementation(adapter, providerCode);
  }
}

module.exports = BaseProviderAdapter;
