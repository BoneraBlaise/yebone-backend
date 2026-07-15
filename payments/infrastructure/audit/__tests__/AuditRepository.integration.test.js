const path = require("path");
const fs = require("fs");
const { describe, it, before, after } = require("node:test");
const assert = require("node:assert/strict");
const mongoose = require("mongoose");

const rootEnv = path.join(__dirname, "..", "..", "..", "..", ".env");
if (fs.existsSync(rootEnv)) {
  require("dotenv").config({ path: rootEnv });
}

const {
  AuditRepository,
  AuditService,
  AuditLog,
  AuditAction,
  ResourceType,
  ActorType,
  ImmutableAuditError,
} = require("../index");

const TEST_URI = process.env.MONGODB_TEST_URI || process.env.DB_URL || null;

describe("Audit MongoDB integration", { skip: !TEST_URI }, () => {
  let repository;
  let service;

  before(async () => {
    await mongoose.connect(TEST_URI);
    repository = new AuditRepository();
    await repository.ensureIndexes();
    await AuditLog.collection.deleteMany({ auditId: /^aud_int_/ });
    service = new AuditService({ repository });
  });

  after(async () => {
    await AuditLog.collection.deleteMany({ auditId: /^aud_int_/ });
    await mongoose.disconnect();
  });

  it("persists immutable audit records in MongoDB", async () => {
    const auditId = `aud_int_${Date.now()}`;
    const entry = await service.record({
      auditId,
      action: AuditAction.PAYMENT_CAPTURED,
      actorId: "buyer-int",
      actorType: ActorType.BUYER,
      resourceType: ResourceType.TRANSACTION,
      resourceId: "txn-int-1",
      before: { status: "PENDING" },
      after: { status: "CAPTURED", token: "should-redact" },
      context: {
        correlationId: `corr-int-${Date.now()}`,
        requestId: `req-int-${Date.now()}`,
      },
    });

    assert.equal(entry.auditId, auditId);
    assert.equal(entry.after.token, "[REDACTED]");

    const stored = await repository.findByAuditId(auditId);
    assert.ok(stored);
    assert.equal(stored.action, "PAYMENT_CAPTURED");

    const byResource = await repository.findByResource(
      ResourceType.TRANSACTION,
      "txn-int-1"
    );
    assert.ok(byResource.some((row) => row.auditId === auditId));
  });

  it("enforces unique auditId index", async () => {
    const auditId = `aud_int_dup_${Date.now()}`;
    await service.record({
      auditId,
      action: AuditAction.SYSTEM_EVENT,
      actorId: "system",
      actorType: ActorType.SYSTEM,
      resourceType: ResourceType.PAYMENT,
      resourceId: "pay-dup",
      context: {
        correlationId: `corr-dup-${Date.now()}`,
        requestId: `req-dup-${Date.now()}`,
      },
    });

    await assert.rejects(
      () =>
        service.record({
          auditId,
          action: AuditAction.SYSTEM_EVENT,
          actorId: "system",
          actorType: ActorType.SYSTEM,
          resourceType: ResourceType.PAYMENT,
          resourceId: "pay-dup-2",
          context: {
            correlationId: `corr-dup-2-${Date.now()}`,
            requestId: `req-dup-2-${Date.now()}`,
          },
        }),
      /duplicate|E11000/i
    );
  });

  it("blocks update and delete operations at schema level", async () => {
    const auditId = `aud_int_immutable_${Date.now()}`;
    await service.record({
      auditId,
      action: AuditAction.ADMIN_OVERRIDE,
      actorId: "admin-1",
      actorType: ActorType.ADMIN,
      resourceType: ResourceType.USER,
      resourceId: "user-1",
      context: {
        correlationId: `corr-immutable-${Date.now()}`,
        requestId: `req-immutable-${Date.now()}`,
      },
    });

    await assert.rejects(
      () => AuditLog.updateOne({ auditId }, { $set: { action: "HACKED" } }),
      ImmutableAuditError
    );

    await assert.rejects(
      () => AuditLog.deleteOne({ auditId }),
      ImmutableAuditError
    );
  });
});

if (!TEST_URI) {
  console.log("Skipping audit integration tests — set MONGODB_TEST_URI or DB_URL");
}
