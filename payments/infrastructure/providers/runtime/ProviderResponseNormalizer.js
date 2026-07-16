const ProviderResponse = require("../models/ProviderResponse");
const ProviderError = require("../models/ProviderError");
const ProviderReferenceContract = require("../ProviderReferenceContract");
const ProviderIdempotencyContract = require("../ProviderIdempotencyContract");

/**
 * Normalizes provider-specific payloads into ProviderResponse.
 */
class ProviderResponseNormalizer {
  constructor(providerCode) {
    this.providerCode = String(providerCode || "").trim().toUpperCase();
    this.referenceContract = new ProviderReferenceContract(this.providerCode);
    this.idempotencyContract = new ProviderIdempotencyContract(this.providerCode);
  }

  normalizeCharge(input = {}) {
    const references = this.referenceContract.buildReference({
      providerCode: this.providerCode,
      reference: input.merchantReference || input.reference,
      providerReference: input.providerReference || input.externalId,
      merchantReference: input.merchantReference || input.reference,
      customerReference: input.customerReference,
      settlementReference: input.settlementReference,
      reconciliationReference: input.reconciliationReference,
    });

    const referenceMetadata = this.referenceContract.buildOptionalMetadata({
      reference: input.reference,
      providerReference: references.providerReference,
      merchantReference: references.merchantReference,
      customerReference: references.customerReference,
      settlementReference: references.settlementReference,
      reconciliationReference: references.reconciliationReference,
    });

    const idempotencyMetadata = input.idempotencyKey
      ? this.idempotencyContract.buildOptionalMetadata({
          operation: "charge",
          reference: input.reference,
          trace: { idempotencyKey: input.idempotencyKey },
        })
      : Object.freeze({});

    return ProviderResponse.fromResult({
      success: input.success !== false,
      mock: Boolean(input.mock),
      providerCode: this.providerCode,
      operation: "charge",
      status: input.status || "SUCCEEDED",
      externalReference: references.providerReference,
      amount: input.amount ?? null,
      currency: input.currency || null,
      metadata: Object.freeze({
        ...referenceMetadata,
        ...idempotencyMetadata,
        correlationId: input.correlationId || null,
        sandbox: Boolean(input.sandbox),
      }),
      data: Object.freeze(input.raw || {}),
    });
  }

  normalizePayout(input = {}) {
    const references = this.referenceContract.buildReference({
      providerCode: this.providerCode,
      reference: input.merchantReference || input.reference,
      providerReference: input.providerReference || input.externalId,
      merchantReference: input.merchantReference || input.reference,
      customerReference: input.customerReference,
      settlementReference: input.settlementReference,
      reconciliationReference: input.reconciliationReference,
    });

    const referenceMetadata = this.referenceContract.buildOptionalMetadata({
      reference: input.reference,
      providerReference: references.providerReference,
      merchantReference: references.merchantReference,
      customerReference: references.customerReference,
      settlementReference: references.settlementReference,
      reconciliationReference: references.reconciliationReference,
    });

    const idempotencyMetadata = input.idempotencyKey
      ? this.idempotencyContract.buildOptionalMetadata({
          operation: "payout",
          reference: input.reference,
          trace: { idempotencyKey: input.idempotencyKey },
        })
      : Object.freeze({});

    return ProviderResponse.fromResult({
      success: input.success !== false,
      mock: Boolean(input.mock),
      providerCode: this.providerCode,
      operation: "payout",
      status: input.status || "SUCCEEDED",
      externalReference: references.providerReference,
      amount: input.amount ?? null,
      currency: input.currency || null,
      metadata: Object.freeze({
        ...referenceMetadata,
        ...idempotencyMetadata,
        correlationId: input.correlationId || null,
        sandbox: Boolean(input.sandbox),
      }),
      data: Object.freeze(input.raw || {}),
    });
  }

  normalizeVerify(input = {}) {
    const references = this.referenceContract.buildReference({
      providerCode: this.providerCode,
      reference: input.merchantReference || input.reference,
      providerReference: input.providerReference || input.externalReference,
      merchantReference: input.merchantReference || input.reference,
    });

    const referenceMetadata = this.referenceContract.buildOptionalMetadata({
      reference: input.reference,
      providerReference: references.providerReference,
      merchantReference: references.merchantReference,
    });

    return ProviderResponse.fromResult({
      success: input.success !== false,
      mock: Boolean(input.mock),
      providerCode: this.providerCode,
      operation: "verify",
      status: input.status || "UNKNOWN",
      externalReference: input.externalReference || references.providerReference,
      amount: input.amount ?? null,
      currency: input.currency || null,
      metadata: Object.freeze({
        ...referenceMetadata,
        correlationId: input.correlationId || null,
        sandbox: Boolean(input.sandbox),
        kind: input.kind || null,
      }),
      data: Object.freeze(input.raw || {}),
    });
  }

  normalizeError(errorResult = {}) {
    const raw = errorResult.error || errorResult;
    const error =
      raw instanceof ProviderError
        ? raw
        : new ProviderError(String(raw?.message || "Provider error"), {
            code: raw?.code || "PROVIDER_ERROR",
          });
    return ProviderResponse.failure(error);
  }
}

module.exports = ProviderResponseNormalizer;
