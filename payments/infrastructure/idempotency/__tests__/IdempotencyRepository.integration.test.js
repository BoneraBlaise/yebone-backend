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
  IdempotencyRepository,
  MongoIdempotencyService,
  IdempotencyTtlCleanup,
  IdempotencyRecord,
} = require("../index");
const IdempotencyConfig = require("../IdempotencyConfig");

const TEST_URI =
  process.env.MONGODB_TEST_URI || process.env.DB_URL || null;

describe("Idempotency MongoDB integration", { skip: !TEST_URI }, () => {
  let repository;
  let service;
  let cleanup;

  before(async () => {
    await mongoose.connect(TEST_URI);
    repository = new IdempotencyRepository();
    await repository.ensureIndexes();
    await IdempotencyRecord.deleteMany({
      idempotencyKey: /^integration-/,
    });
    service = new MongoIdempotencyService({
      repository,
      scope: "integration",
      ttlSeconds: 3600,
    });
    cleanup = new IdempotencyTtlCleanup({ repository });
  });

  after(async () => {
    await IdempotencyRecord.deleteMany({
      idempotencyKey: /^integration-/,
    });
    await mongoose.disconnect();
  });

  it("persists and replays completed records in MongoDB", async () => {
    const key = `integration-${Date.now()}-1`;
    const payload = { amount: 1200, currency: "RWF" };
    let runs = 0;

    const first = await service.execute(
      key,
      payload,
      async () => {
        runs += 1;
        return { paymentReference: "pay-int-1", status: "COMPLETED" };
      },
      {
        correlationId: "corr-int-1",
        requestId: `req-${key}`,
        paymentReference: "pay-int-1",
      }
    );

    const stored = await repository.findByKey("integration", key);
    assert.ok(stored);
    assert.equal(stored.status, IdempotencyConfig.recordStatus.COMPLETED);
    assert.equal(stored.correlationId, "corr-int-1");
    assert.equal(stored.paymentReference, "pay-int-1");

    const second = await service.execute(key, payload, async () => {
      runs += 1;
      return { paymentReference: "pay-int-1", status: "COMPLETED" };
    });

    assert.equal(runs, 1);
    assert.equal(first.replayed, false);
    assert.equal(second.replayed, true);
  });

  it("enforces unique requestId index", async () => {
    const sharedRequestId = `req-dup-${Date.now()}`;
    const claimA = await repository.claimProcessing({
      scope: "integration",
      idempotencyKey: `integration-req-a-${Date.now()}`,
      fingerprint: "fp-a",
      correlationId: "c1",
      requestId: sharedRequestId,
      expiresAt: new Date(Date.now() + 3600000),
    });
    assert.equal(claimA.claimed, true);

    const RequestIdConflictError = require("../errors/RequestIdConflictError");
    await assert.rejects(
      () =>
        repository.claimProcessing({
          scope: "integration",
          idempotencyKey: `integration-req-b-${Date.now()}`,
          fingerprint: "fp-b",
          correlationId: "c2",
          requestId: sharedRequestId,
          expiresAt: new Date(Date.now() + 3600000),
        }),
      RequestIdConflictError
    );
  });

  it("cleans stale PROCESSING records", async () => {
    const staleKey = `integration-stale-${Date.now()}`;
    const doc = await IdempotencyRecord.create({
      scope: "integration",
      idempotencyKey: staleKey,
      fingerprint: "stale-fp",
      correlationId: "corr-stale",
      requestId: `req-stale-${Date.now()}`,
      status: IdempotencyConfig.recordStatus.PROCESSING,
      expiresAt: new Date(Date.now() + 3600000),
    });
    await IdempotencyRecord.collection.updateOne(
      { _id: doc._id },
      { $set: { createdAt: new Date(Date.now() - 3600000) } }
    );

    const result = await cleanup.run();
    assert.ok(result.removed >= 1);

    const remaining = await repository.findByKey("integration", staleKey);
    assert.equal(remaining, null);
  });
});

if (!TEST_URI) {
  console.log("Skipping MongoDB integration tests — set MONGODB_TEST_URI or DB_URL");
}
