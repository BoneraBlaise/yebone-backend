/**
 * Canonical webhook reconciliation result — every webhook path returns this model.
 * WebhookRouter maps it to HTTP; EventPublisher and audit consume the same shape.
 */
class WebhookReconciliationResult {
  static create(fields = {}) {
    return Object.freeze({
      accepted: fields.accepted === true,
      verified: fields.verified === true,
      duplicate: fields.duplicate === true,
      replay: fields.replay === true,
      reconciled: fields.reconciled === true,
      settlementExecuted: fields.settlementExecuted === true,
      previousStatus: fields.previousStatus || null,
      currentStatus: fields.currentStatus || null,
      transactionId: fields.transactionId || null,
      providerReference: fields.providerReference || null,
      providerEventId: fields.providerEventId || null,
      correlationId: fields.correlationId || null,
      executionMode: fields.executionMode || null,
      providerCode: fields.providerCode || null,
      mock: fields.mock === true,
      reason: fields.reason || null,
      eventIds: Object.freeze([...(fields.eventIds || [])]),
      ledgerEntryIds: Object.freeze([...(fields.ledgerEntryIds || [])]),
      auditId: fields.auditId || null,
      timestamp: fields.timestamp || new Date().toISOString(),
    });
  }

  static verifyOnly({ verified, correlationId, executionMode, providerReference, providerEventId, reason, providerCode, mock }) {
    return WebhookReconciliationResult.create({
      accepted: verified === true,
      verified: verified === true,
      duplicate: false,
      replay: false,
      reconciled: false,
      settlementExecuted: false,
      correlationId,
      executionMode,
      providerReference,
      providerEventId,
      providerCode,
      mock: mock === true,
      reason: reason || (verified ? "VERIFIED_ONLY" : "NOT_VERIFIED"),
    });
  }

  static replayRejected({ correlationId, executionMode, providerReference, providerEventId }) {
    return WebhookReconciliationResult.create({
      accepted: false,
      verified: true,
      duplicate: false,
      replay: true,
      reconciled: false,
      settlementExecuted: false,
      correlationId,
      executionMode,
      providerReference,
      providerEventId,
      reason: "REPLAY_WINDOW_EXCEEDED",
    });
  }

  static duplicate({ cached, correlationId, executionMode }) {
    return WebhookReconciliationResult.create({
      ...cached,
      accepted: cached.accepted !== false,
      verified: cached.verified === true,
      duplicate: true,
      replay: false,
      correlationId: correlationId || cached.correlationId,
      executionMode: executionMode || cached.executionMode,
      reason: cached.reason || "DUPLICATE_WEBHOOK",
    });
  }

  static toHttpData(result) {
    return Object.freeze({
      accepted: result.accepted,
      verified: result.verified,
      duplicate: result.duplicate,
      replay: result.replay,
      reconciled: result.reconciled,
      settlementExecuted: result.settlementExecuted,
      previousStatus: result.previousStatus,
      currentStatus: result.currentStatus,
      transactionId: result.transactionId,
      providerReference: result.providerReference,
      providerEventId: result.providerEventId,
      correlationId: result.correlationId,
      executionMode: result.executionMode,
      providerCode: result.providerCode,
      mock: result.mock,
      reason: result.reason,
      eventIds: result.eventIds,
      ledgerEntryIds: result.ledgerEntryIds,
      auditId: result.auditId,
      timestamp: result.timestamp,
    });
  }

  static httpStatus(result) {
    if (result.duplicate) {
      return 200;
    }
    if (result.replay) {
      return 202;
    }
    if (result.reason === "IN_PROGRESS") {
      return 409;
    }
    return 202;
  }
}

module.exports = WebhookReconciliationResult;
