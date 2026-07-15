const REFERENCE_FIELDS = Object.freeze([
  "providerReference",
  "merchantReference",
  "customerReference",
  "settlementReference",
  "reconciliationReference",
]);

/**
 * Immutable normalized provider reference model.
 * Architecture-only — not transmitted to external APIs at Module 9.
 */
class ProviderReference {
  static REFERENCE_FIELDS = REFERENCE_FIELDS;

  static create(input = {}) {
    const providerCode = ProviderReference._normalizeCode(input.providerCode);
    if (!providerCode) {
      throw new Error("ProviderReference requires providerCode");
    }

    const references = Object.freeze({
      providerReference: ProviderReference._optionalString(input.providerReference),
      merchantReference: ProviderReference._optionalString(input.merchantReference),
      customerReference: ProviderReference._optionalString(input.customerReference),
      settlementReference: ProviderReference._optionalString(input.settlementReference),
      reconciliationReference: ProviderReference._optionalString(input.reconciliationReference),
    });

    return Object.freeze({
      providerCode,
      ...references,
      mock: Boolean(input.mock !== false),
      transmitted: Boolean(input.transmitted),
      source: String(input.source || "ProviderReference.create"),
    });
  }

  static toJSON(reference) {
    if (!reference) {
      return null;
    }

    return Object.freeze({
      providerCode: reference.providerCode,
      providerReference: reference.providerReference,
      merchantReference: reference.merchantReference,
      customerReference: reference.customerReference,
      settlementReference: reference.settlementReference,
      reconciliationReference: reference.reconciliationReference,
      mock: Boolean(reference.mock),
      transmitted: Boolean(reference.transmitted),
      source: reference.source,
    });
  }

  static toMetadata(reference) {
    if (!reference) {
      return Object.freeze({});
    }

    const json = ProviderReference.toJSON(reference);
    return Object.freeze({
      providerReferenceCode: json.providerCode,
      providerReferenceProvider: json.providerReference,
      providerReferenceMerchant: json.merchantReference,
      providerReferenceCustomer: json.customerReference,
      providerReferenceSettlement: json.settlementReference,
      providerReferenceReconciliation: json.reconciliationReference,
      providerReferenceMock: json.mock,
      providerReferenceTransmitted: json.transmitted,
    });
  }

  static _normalizeCode(value) {
    return String(value || "").trim().toUpperCase();
  }

  static _optionalString(value) {
    if (value === null || value === undefined || value === "") {
      return null;
    }
    return String(value).trim();
  }
}

module.exports = ProviderReference;
