const { describe, it, beforeEach } = require("node:test");
const assert = require("node:assert/strict");
const AuditService = require("../AuditService");
const { AuditAction, ResourceType, ActorType } = require("../AuditEvent");

function createMemoryRepository() {
  const store = [];

  return {
    store,
    async ensureIndexes() {},
    async append(record) {
      const doc = { ...record, createdAt: new Date() };
      store.push(Object.freeze(doc));
      return { ...doc };
    },
    async findByAuditId(auditId) {
      return store.find((row) => row.auditId === auditId) || null;
    },
    async findByCorrelationId(correlationId) {
      return store.filter((row) => row.correlationId === correlationId);
    },
    async findByResource(resourceType, resourceId) {
      return store.filter(
        (row) => row.resourceType === resourceType && row.resourceId === resourceId
      );
    },
    async findByActor(actorId) {
      return store.filter((row) => row.actorId === actorId);
    },
    async findByAction(action) {
      return store.filter((row) => row.action === action);
    },
  };
}

describe("AuditService (unit)", () => {
  let repository;
  let service;

  beforeEach(() => {
    repository = createMemoryRepository();
    service = new AuditService({ repository });
  });

  it("records append-only audit events", async () => {
    const entry = await service.record({
      action: AuditAction.PAYMENT_CREATED,
      actorId: "buyer-1",
      actorType: ActorType.BUYER,
      resourceType: ResourceType.TRANSACTION,
      resourceId: "txn-1",
      before: null,
      after: { status: "CREATED" },
      context: { correlationId: "corr-1", requestId: "req-1" },
    });

    assert.match(entry.auditId, /^aud_/);
    assert.equal(entry.action, "PAYMENT_CREATED");
    assert.equal(entry.correlationId, "corr-1");
    assert.equal(repository.store.length, 1);
    assert.equal(Object.isFrozen(entry), true);
  });

  it("sanitizes secrets in before/after/metadata", async () => {
    const entry = await service.record({
      action: AuditAction.SYSTEM_EVENT,
      actorId: "system",
      actorType: ActorType.SYSTEM,
      resourceType: ResourceType.PAYMENT,
      resourceId: "pay-1",
      metadata: { apiKey: "secret-key", note: "ok" },
      context: { correlationId: "corr-2", requestId: "req-2" },
    });

    assert.equal(entry.metadata.apiKey, "[REDACTED]");
    assert.equal(entry.metadata.note, "ok");
  });

  it("rejects oversized payloads", async () => {
    const huge = "x".repeat(9000);
    await assert.rejects(
      () =>
        service.record({
          action: AuditAction.SYSTEM_EVENT,
          actorId: "system",
          actorType: ActorType.SYSTEM,
          resourceType: ResourceType.PAYMENT,
          resourceId: "pay-2",
          metadata: { huge },
          context: { correlationId: "corr-3", requestId: "req-3" },
        }),
      /maximum size/
    );
  });

  it("records from request context", async () => {
    const req = {
      headers: {
        "x-correlation-id": "corr-req",
        "x-request-id": "req-req",
        "user-agent": "jest",
      },
      ip: "127.0.0.1",
      user: { _id: "user-99" },
    };

    const entry = await service.recordFromRequest(req, {
      action: AuditAction.ORDER_PAYMENT_COMPLETED,
      actorType: ActorType.BUYER,
      resourceType: ResourceType.ORDER,
      resourceId: "ord-1",
      context: {},
    });

    assert.equal(entry.correlationId, "corr-req");
    assert.equal(entry.actorId, "user-99");
    assert.equal(entry.ipAddress, "127.0.0.1");
  });
});
