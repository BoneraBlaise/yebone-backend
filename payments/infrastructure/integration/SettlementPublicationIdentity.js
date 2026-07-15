const crypto = require("crypto");
const AuditConfig = require("../audit/AuditConfig");
const EventBusConfig = require("../events/EventBusConfig");

const PUBLICATION_IDENTITY_VERSION = "1.0";

/**
 * Immutable identity rules for replay-safe audit and event publication.
 * Design-only in Module 8 — pipeline does not consume these ids at runtime yet.
 */
class SettlementPublicationIdentity {
  static AUDIT_IDENTITY_FIELDS = Object.freeze([
    "idempotencyKey",
    "action",
    "resourceType",
    "resourceId",
  ]);

  static EVENT_IDENTITY_FIELDS = Object.freeze([
    "idempotencyKey",
    "eventType",
    "aggregateType",
    "aggregateId",
  ]);

  static deriveAuditIdentity(input = {}) {
    const idempotencyKey = SettlementPublicationIdentity._required(input.idempotencyKey, "idempotencyKey");
    const action = SettlementPublicationIdentity._required(input.action, "action").toUpperCase();
    const resourceType = SettlementPublicationIdentity._required(input.resourceType, "resourceType").toUpperCase();
    const resourceId = SettlementPublicationIdentity._required(input.resourceId, "resourceId");

    const digest = SettlementPublicationIdentity._digest([
      PUBLICATION_IDENTITY_VERSION,
      "audit",
      idempotencyKey,
      action,
      resourceType,
      resourceId,
    ]);

    return Object.freeze({
      auditId: `${AuditConfig.auditIdPrefix}_settle_${digest}`,
      dedupeKey: `audit:settlement:${digest}`,
      identityVersion: PUBLICATION_IDENTITY_VERSION,
      fields: SettlementPublicationIdentity.AUDIT_IDENTITY_FIELDS,
    });
  }

  static deriveEventIdentity(input = {}) {
    const idempotencyKey = SettlementPublicationIdentity._required(input.idempotencyKey, "idempotencyKey");
    const eventType = SettlementPublicationIdentity._required(input.eventType, "eventType").toUpperCase();
    const aggregateType = SettlementPublicationIdentity._required(
      input.aggregateType || EventBusConfig.defaultAggregateType,
      "aggregateType"
    ).toUpperCase();
    const aggregateId = SettlementPublicationIdentity._required(input.aggregateId, "aggregateId");

    const digest = SettlementPublicationIdentity._digest([
      PUBLICATION_IDENTITY_VERSION,
      "event",
      idempotencyKey,
      eventType,
      aggregateType,
      aggregateId,
    ]);

    return Object.freeze({
      eventId: `evt_settle_${digest}`,
      dedupeKey: `event:settlement:${digest}`,
      identityVersion: PUBLICATION_IDENTITY_VERSION,
      fields: SettlementPublicationIdentity.EVENT_IDENTITY_FIELDS,
    });
  }

  static fromSettlementContext(context, { action, eventType, aggregateType } = {}) {
    const transactionId = context.transaction?.transactionId;
    if (!transactionId) {
      throw new Error("transactionId is required to derive publication identity");
    }

    return Object.freeze({
      audit: SettlementPublicationIdentity.deriveAuditIdentity({
        idempotencyKey: context.trace.idempotencyKey,
        action,
        resourceType: "TRANSACTION",
        resourceId: transactionId,
      }),
      event: SettlementPublicationIdentity.deriveEventIdentity({
        idempotencyKey: context.trace.idempotencyKey,
        eventType,
        aggregateType,
        aggregateId: transactionId,
      }),
    });
  }

  static _digest(parts) {
    return crypto.createHash("sha256").update(parts.join("|")).digest("hex").slice(0, 24);
  }

  static _required(value, fieldName) {
    const normalized = String(value || "").trim();
    if (!normalized) {
      throw new Error(`${fieldName} is required for publication identity`);
    }
    return normalized;
  }
}

module.exports = SettlementPublicationIdentity;
