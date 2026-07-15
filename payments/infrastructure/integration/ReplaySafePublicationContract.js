const SettlementPublicationIdentity = require("./SettlementPublicationIdentity");
const { ExecutionStage } = require("./ExecutionStage");

/**
 * Architecture contract for future replay-safe audit and event publication.
 * No runtime deduplication in Module 8 — documents Module 9+ integration plan.
 */
class ReplaySafePublicationContract {
  static describe() {
    return Object.freeze({
      implemented: false,
      module: "integration-gate",
      targetActivation: "Module 9+",
      version: SettlementPublicationIdentity.deriveAuditIdentity({
        idempotencyKey: "contract",
        action: "PAYMENT_SETTLED",
        resourceType: "TRANSACTION",
        resourceId: "contract",
      }).identityVersion,
      audit: ReplaySafePublicationContract._auditStrategy(),
      events: ReplaySafePublicationContract._eventStrategy(),
      pipelineStages: Object.freeze([ExecutionStage.AUDIT, ExecutionStage.EVENTS]),
      currentBehavior: Object.freeze({
        auditIdGeneration: "AuditHelper.generateAuditId() — random UUID per append",
        eventIdGeneration: "DomainEvent.create() — random UUID unless explicitly supplied",
        deduplication: "none",
        retryDuplicateRisk: true,
      }),
    });
  }

  static _auditStrategy() {
    return Object.freeze({
      identity: SettlementPublicationIdentity.AUDIT_IDENTITY_FIELDS,
      derive: "SettlementPublicationIdentity.deriveAuditIdentity()",
      futureRecordShape: Object.freeze({
        auditId: "deterministic aud_settle_{digest}",
        dedupeKey: "audit:settlement:{digest}",
      }),
      futurePrevention: Object.freeze([
        "Pass derived auditId into AuditService.record() on settlement retry",
        "Unique index on auditId in payment_audit_logs (already append-only)",
        "Repository append rejects duplicate auditId with idempotent return of existing record",
        "Optional dedupeKey secondary index for cross-system reconciliation",
      ]),
      activationStage: ExecutionStage.AUDIT,
    });
  }

  static _eventStrategy() {
    return Object.freeze({
      identity: SettlementPublicationIdentity.EVENT_IDENTITY_FIELDS,
      derive: "SettlementPublicationIdentity.deriveEventIdentity()",
      futureEnvelopeShape: Object.freeze({
        eventId: "deterministic evt_settle_{digest}",
        dedupeKey: "event:settlement:{digest}",
      }),
      futurePrevention: Object.freeze([
        "Pass derived eventId into EventBus.publish() on settlement retry",
        "In-process dedupe registry keyed by eventId before dispatch",
        "Future durable outbox table with unique eventId constraint",
        "Subscribers remain idempotent as defense-in-depth",
      ]),
      activationStage: ExecutionStage.EVENTS,
    });
  }

  static assertFutureAuditIdentity(input) {
    const identity = SettlementPublicationIdentity.deriveAuditIdentity(input);
    return Object.freeze({
      expectedBehavior: "duplicate append with same auditId returns existing record without side effects",
      identity,
    });
  }

  static assertFutureEventIdentity(input) {
    const identity = SettlementPublicationIdentity.deriveEventIdentity(input);
    return Object.freeze({
      expectedBehavior: "duplicate publish with same eventId skips dispatch and returns existing eventId",
      identity,
    });
  }
}

module.exports = ReplaySafePublicationContract;
