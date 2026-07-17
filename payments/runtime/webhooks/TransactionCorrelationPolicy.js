/**
 * Immutable correlation chain for webhook reconciliation.
 * A single correlationId is established at the HTTP boundary and propagated
 * unchanged through idempotency, settlement, events, audit, and responses.
 * No downstream component may generate a replacement correlationId.
 */
class TransactionCorrelationPolicy {
  static create(input = {}) {
    const correlationId = TransactionCorrelationPolicy._requireCorrelationId(input.correlationId);

    return Object.freeze({
      correlationId,
      providerEventId: input.providerEventId || null,
      providerReference: input.providerReference || null,
      transactionId: input.transactionId || null,
      ledgerEntryId: input.ledgerEntryId || null,
      eventId: input.eventId || null,
      auditId: input.auditId || null,
    });
  }

  static fromWebhookInput({ correlationId, verification = {}, payload = {}, payloadMaterial = null }) {
    const providerReference =
      verification.references?.providerReference ||
      payload.providerReference ||
      payload.reference ||
      payload.transactionRef ||
      null;

    const providerEventId =
      payload.eventId ||
      payload.id ||
      payload.event_id ||
      verification.eventId ||
      null;

    return TransactionCorrelationPolicy.create({
      correlationId,
      providerEventId,
      providerReference,
    });
  }

  static enrich(chain, patch = {}) {
    if (!chain || !chain.correlationId) {
      throw new Error("TransactionCorrelationPolicy.enrich requires an existing correlation chain");
    }

    if (patch.correlationId && patch.correlationId !== chain.correlationId) {
      throw new Error("TransactionCorrelationPolicy forbids replacing correlationId");
    }

    return TransactionCorrelationPolicy.create({
      correlationId: chain.correlationId,
      providerEventId: patch.providerEventId ?? chain.providerEventId,
      providerReference: patch.providerReference ?? chain.providerReference,
      transactionId: patch.transactionId ?? chain.transactionId,
      ledgerEntryId: patch.ledgerEntryId ?? chain.ledgerEntryId,
      eventId: patch.eventId ?? chain.eventId,
      auditId: patch.auditId ?? chain.auditId,
    });
  }

  static toLogContext(chain) {
    return Object.freeze({
      correlationId: chain.correlationId,
      providerEventId: chain.providerEventId,
      providerReference: chain.providerReference,
      transactionId: chain.transactionId,
      ledgerEntryId: chain.ledgerEntryId,
      eventId: chain.eventId,
      auditId: chain.auditId,
    });
  }

  static toIdempotencyMetadata(chain) {
    return Object.freeze({
      correlationId: chain.correlationId,
      requestId: `${chain.correlationId}:${chain.providerEventId || "webhook"}`,
      paymentReference: chain.providerReference,
      metadata: TransactionCorrelationPolicy.toLogContext(chain),
    });
  }

  static toEventTrace(chain) {
    return Object.freeze({
      correlationId: chain.correlationId,
      requestId: `${chain.correlationId}:${chain.providerEventId || "webhook"}`,
      providerReference: chain.providerReference,
      providerEventId: chain.providerEventId,
      transactionId: chain.transactionId,
    });
  }

  static _requireCorrelationId(value) {
    const normalized = String(value || "").trim();
    if (!normalized) {
      throw new Error("correlationId is required for webhook reconciliation");
    }
    return normalized;
  }
}

module.exports = TransactionCorrelationPolicy;
