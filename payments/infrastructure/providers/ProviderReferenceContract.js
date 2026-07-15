const ProviderRequest = require("./models/ProviderRequest");
const ProviderReference = require("./ProviderReference");

const REFERENCE_PREFIX = "pref";

/**
 * Provider reference architecture — design only at Module 9.
 * Does not transmit references to provider APIs or alter adapter execution.
 */
class ProviderReferenceContract {
  constructor(providerCode) {
    this.providerCode = String(providerCode || "").trim().toUpperCase();
  }

  static describeFutureBehavior() {
    return Object.freeze({
      module: 10,
      transmittedToProvider: false,
      buildReference:
        "Normalize provider, merchant, customer, settlement, and reconciliation references",
      validateReference: "Validate reference shape and provider ownership before transmission",
      httpRequired: false,
    });
  }

  buildReference(input = {}) {
    const request = ProviderRequest.normalize({
      ...input,
      providerCode: input.providerCode || this.providerCode,
    });

    const metadata = request.metadata || {};

    return ProviderReference.create({
      providerCode: request.providerCode,
      providerReference:
        input.providerReference ||
        metadata.providerReference ||
        ProviderReferenceContract._mockReference(REFERENCE_PREFIX, request.providerCode, "provider", request.reference),
      merchantReference:
        input.merchantReference || metadata.merchantReference || request.reference || null,
      customerReference:
        input.customerReference || metadata.customerReference || metadata.buyerId || null,
      settlementReference:
        input.settlementReference || metadata.settlementReference || null,
      reconciliationReference:
        input.reconciliationReference || metadata.reconciliationReference || null,
      mock: true,
      transmitted: false,
      source: "ProviderReferenceContract.buildReference",
    });
  }

  validateReference(referenceInput) {
    const reference =
      referenceInput && typeof referenceInput === "object"
        ? referenceInput
        : null;

    if (!reference) {
      return Object.freeze({ valid: false, reason: "REFERENCE_MISSING" });
    }

    if (!reference.providerCode) {
      return Object.freeze({ valid: false, reason: "PROVIDER_CODE_MISSING" });
    }

    if (String(reference.providerCode).toUpperCase() !== this.providerCode) {
      return Object.freeze({
        valid: false,
        reason: "PROVIDER_MISMATCH",
        expectedProvider: this.providerCode,
      });
    }

    const hasAnyReference = ProviderReference.REFERENCE_FIELDS.some(
      (field) => reference[field]
    );

    if (!hasAnyReference) {
      return Object.freeze({ valid: false, reason: "REFERENCE_FIELDS_EMPTY" });
    }

    return Object.freeze({
      valid: true,
      providerCode: this.providerCode,
      mock: Boolean(reference.mock),
      transmitted: Boolean(reference.transmitted),
    });
  }

  buildOptionalMetadata(input = {}) {
    const reference = this.buildReference(input);
    return ProviderReference.toMetadata(reference);
  }

  static _mockReference(prefix, providerCode, role, seed) {
    const normalizedProvider = String(providerCode).toLowerCase().replace(/_/g, "");
    const normalizedSeed = String(seed || "unknown").replace(/[^a-zA-Z0-9_-]/g, "_");
    return `${prefix}_${normalizedProvider}_${role}_${normalizedSeed}`;
  }
}

module.exports = ProviderReferenceContract;
