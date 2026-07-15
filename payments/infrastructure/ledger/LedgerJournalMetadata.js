/**
 * Optional journal metadata fields for future reporting, reconciliation, and analytics.
 * All fields are optional — never required for posting.
 */
const OPTIONAL_REPORTING_FIELDS = Object.freeze([
  "tenantId",
  "shopId",
  "sellerId",
  "buyerId",
  "providerCode",
  "paymentMethod",
  "countryCode",
  "currencyRate",
]);

class LedgerJournalMetadata {
  static fields() {
    return [...OPTIONAL_REPORTING_FIELDS];
  }

  static build(input = {}) {
    const metadata =
      input.metadata && typeof input.metadata === "object" && !Array.isArray(input.metadata)
        ? { ...input.metadata }
        : {};

    for (const field of OPTIONAL_REPORTING_FIELDS) {
      if (input[field] !== undefined && input[field] !== null && metadata[field] === undefined) {
        metadata[field] = input[field];
      }
    }

    return metadata;
  }
}

module.exports = LedgerJournalMetadata;
