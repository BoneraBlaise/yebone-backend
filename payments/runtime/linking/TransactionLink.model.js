const crypto = require("node:crypto");
const TransactionLinkConfig = require("./TransactionLinkConfig");

/**
 * Immutable mapping record between legacy and Module 2 transaction identifiers.
 */
class TransactionLink {
  static create(input = {}) {
    const linkId = input.linkId || `link_${crypto.randomUUID()}`;
    const correlationId = String(input.correlationId || "").trim();
    if (!correlationId) {
      throw new Error("TransactionLink requires correlationId");
    }

    const module2TransactionId = TransactionLink._optionalId(input.module2TransactionId);
    if (!module2TransactionId) {
      throw new Error("TransactionLink requires module2TransactionId");
    }

    return Object.freeze({
      linkId,
      legacyTransactionId: TransactionLink._optionalId(input.legacyTransactionId),
      module2TransactionId,
      providerReference: TransactionLink._optionalId(input.providerReference),
      paymentReference: TransactionLink._optionalId(input.paymentReference),
      orderId: TransactionLink._optionalId(input.orderId),
      sellerId: TransactionLink._optionalId(input.sellerId),
      buyerId: TransactionLink._optionalId(input.buyerId),
      providerCode: TransactionLink._optionalId(input.providerCode)?.toUpperCase() || null,
      correlationId,
      chargePath: input.chargePath || TransactionLinkConfig.chargePath.LEGACY,
      createdAt: input.createdAt || new Date().toISOString(),
    });
  }

  static _optionalId(value) {
    if (value === null || value === undefined || value === "") {
      return null;
    }
    return String(value).trim();
  }
}

module.exports = TransactionLink;
