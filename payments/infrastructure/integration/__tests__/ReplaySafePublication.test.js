const { describe, it, beforeEach } = require("node:test");
const assert = require("node:assert/strict");
const { createTestIntegrationFoundation } = require("./testHelpers");
const SettlementPublicationIdentity = require("../SettlementPublicationIdentity");
const ReplaySafePublicationContract = require("../ReplaySafePublicationContract");
const { AuditAction, ResourceType } = require("../../audit/AuditEvent");
const { EventTypes } = require("../../events");

describe("Replay-safe publication (future-ready design)", () => {
  describe("SettlementPublicationIdentity", () => {
    it("derives stable audit identity for the same settlement inputs", () => {
      const input = {
        idempotencyKey: "idem-audit-stable",
        action: AuditAction.PAYMENT_SETTLED,
        resourceType: ResourceType.TRANSACTION,
        resourceId: "txn_settle_abc123",
      };

      const first = SettlementPublicationIdentity.deriveAuditIdentity(input);
      const second = SettlementPublicationIdentity.deriveAuditIdentity(input);

      assert.equal(first.auditId, second.auditId);
      assert.match(first.auditId, /^aud_settle_[a-f0-9]{24}$/);
      assert.equal(first.dedupeKey, second.dedupeKey);
      assert.equal(Object.isFrozen(first), true);
    });

    it("derives stable event identity for the same settlement inputs", () => {
      const input = {
        idempotencyKey: "idem-event-stable",
        eventType: EventTypes.PAYMENT_SETTLED,
        aggregateType: "PAYMENT",
        aggregateId: "txn_settle_xyz789",
      };

      const first = SettlementPublicationIdentity.deriveEventIdentity(input);
      const second = SettlementPublicationIdentity.deriveEventIdentity(input);

      assert.equal(first.eventId, second.eventId);
      assert.match(first.eventId, /^evt_settle_[a-f0-9]{24}$/);
      assert.equal(first.dedupeKey, second.dedupeKey);
      assert.equal(Object.isFrozen(first), true);
    });

    it("produces different identities for different idempotency keys", () => {
      const base = {
        action: AuditAction.PAYMENT_SETTLED,
        resourceType: ResourceType.TRANSACTION,
        resourceId: "txn-1",
        eventType: EventTypes.PAYMENT_SETTLED,
        aggregateType: "PAYMENT",
        aggregateId: "txn-1",
      };

      const auditA = SettlementPublicationIdentity.deriveAuditIdentity({
        ...base,
        idempotencyKey: "key-a",
      });
      const auditB = SettlementPublicationIdentity.deriveAuditIdentity({
        ...base,
        idempotencyKey: "key-b",
      });

      const eventA = SettlementPublicationIdentity.deriveEventIdentity({
        ...base,
        idempotencyKey: "key-a",
      });
      const eventB = SettlementPublicationIdentity.deriveEventIdentity({
        ...base,
        idempotencyKey: "key-b",
      });

      assert.notEqual(auditA.auditId, auditB.auditId);
      assert.notEqual(eventA.eventId, eventB.eventId);
    });

    it("derives paired identities from settlement context", () => {
      const context = {
        trace: { idempotencyKey: "ctx-idem-key" },
        transaction: { transactionId: "txn_ctx_001" },
      };

      const paired = SettlementPublicationIdentity.fromSettlementContext(context, {
        action: AuditAction.PAYMENT_SETTLED,
        eventType: EventTypes.PAYMENT_SETTLED,
        aggregateType: "PAYMENT",
      });

      assert.ok(paired.audit.auditId.startsWith("aud_settle_"));
      assert.ok(paired.event.eventId.startsWith("evt_settle_"));
      assert.equal(Object.isFrozen(paired), true);
    });
  });

  describe("ReplaySafePublicationContract", () => {
    it("documents that runtime deduplication is not yet implemented", () => {
      const contract = ReplaySafePublicationContract.describe();

      assert.equal(contract.implemented, false);
      assert.equal(contract.currentBehavior.deduplication, "none");
      assert.equal(contract.currentBehavior.retryDuplicateRisk, true);
      assert.ok(contract.audit.futurePrevention.length >= 3);
      assert.ok(contract.events.futurePrevention.length >= 3);
    });

    it("describes expected future idempotent audit append behavior", () => {
      const future = ReplaySafePublicationContract.assertFutureAuditIdentity({
        idempotencyKey: "future-audit",
        action: AuditAction.PAYMENT_SETTLED,
        resourceType: ResourceType.TRANSACTION,
        resourceId: "txn_future",
      });

      assert.match(future.expectedBehavior, /duplicate append/i);
      assert.match(future.identity.auditId, /^aud_settle_/);
    });

    it("describes expected future idempotent event publish behavior", () => {
      const future = ReplaySafePublicationContract.assertFutureEventIdentity({
        idempotencyKey: "future-event",
        eventType: EventTypes.PAYMENT_SETTLED,
        aggregateType: "PAYMENT",
        aggregateId: "txn_future_evt",
      });

      assert.match(future.expectedBehavior, /duplicate publish/i);
      assert.match(future.identity.eventId, /^evt_settle_/);
    });
  });

  describe("current runtime invariant (unchanged)", () => {
    let foundation;

    beforeEach(() => {
      foundation = createTestIntegrationFoundation();
    });

    it("pipeline still assigns random audit ids — not deterministic publication ids", async () => {
      const idempotencyKey = "runtime-random-audit";
      const input = {
        orderId: "ord-runtime",
        buyerId: "buyer-runtime",
        sellerId: "seller-runtime",
        amount: 5000,
      };

      await foundation.gate.execute(input, { correlationId: "corr-runtime", idempotencyKey });

      const audit = foundation.auditRepository.store[0];
      const expected = SettlementPublicationIdentity.deriveAuditIdentity({
        idempotencyKey,
        action: AuditAction.PAYMENT_SETTLED,
        resourceType: ResourceType.TRANSACTION,
        resourceId: audit.resourceId,
      });

      assert.match(audit.auditId, /^aud_/);
      assert.notEqual(audit.auditId, expected.auditId);
    });

    it("documents future expectation: failed retry would use deterministic ids when activated", () => {
      const idempotencyKey = "future-retry-idem";
      const transactionId = "txn_future_retry";

      const futureAudit = SettlementPublicationIdentity.deriveAuditIdentity({
        idempotencyKey,
        action: AuditAction.PAYMENT_SETTLED,
        resourceType: ResourceType.TRANSACTION,
        resourceId: transactionId,
      });
      const futureEvent = SettlementPublicationIdentity.deriveEventIdentity({
        idempotencyKey,
        eventType: EventTypes.PAYMENT_SETTLED,
        aggregateType: "PAYMENT",
        aggregateId: transactionId,
      });

      const retryOne = SettlementPublicationIdentity.deriveAuditIdentity({
        idempotencyKey,
        action: AuditAction.PAYMENT_SETTLED,
        resourceType: ResourceType.TRANSACTION,
        resourceId: transactionId,
      });
      const retryTwo = SettlementPublicationIdentity.deriveEventIdentity({
        idempotencyKey,
        eventType: EventTypes.PAYMENT_SETTLED,
        aggregateType: "PAYMENT",
        aggregateId: transactionId,
      });

      assert.equal(futureAudit.auditId, retryOne.auditId);
      assert.equal(futureEvent.eventId, retryTwo.eventId);
    });
  });
});
