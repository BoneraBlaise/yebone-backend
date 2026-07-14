const { describe, it, beforeEach } = require("node:test");
const assert = require("node:assert/strict");
const MongoIdempotencyService = require("../MongoIdempotencyService");
const DuplicateRequestError = require("../../../orchestration/errors/DuplicateRequestError");
const InProgressRequestError = require("../errors/InProgressRequestError");
const IdempotencyConfig = require("../IdempotencyConfig");

const { PROCESSING, COMPLETED, FAILED } = IdempotencyConfig.recordStatus;

function createMemoryRepository() {
  const store = new Map();
  const requestIndex = new Map();

  const keyOf = (scope, idempotencyKey) => `${scope || ""}::${idempotencyKey}`;

  return {
    records: store,
    async ensureIndexes() {},
    async findByKey(scope, idempotencyKey) {
      return store.get(keyOf(scope, idempotencyKey)) || null;
    },
    async findByRequestId(requestId) {
      const k = requestIndex.get(requestId);
      return k ? store.get(k) || null : null;
    },
    async claimProcessing(input) {
      const k = keyOf(input.scope, input.idempotencyKey);
      if (store.has(k)) {
        return { claimed: false, record: store.get(k) };
      }
      if (requestIndex.has(input.requestId)) {
        const existingKey = requestIndex.get(input.requestId);
        const existing = store.get(existingKey);
        const RequestIdConflictError = require("../errors/RequestIdConflictError");
        throw new RequestIdConflictError(input.requestId, existing.idempotencyKey);
      }
      const record = {
        ...input,
        status: PROCESSING,
        createdAt: new Date(),
      };
      store.set(k, record);
      requestIndex.set(input.requestId, k);
      return { claimed: true, record };
    },
    async markCompleted(scope, idempotencyKey, result) {
      const k = keyOf(scope, idempotencyKey);
      const record = store.get(k);
      if (!record || record.status !== PROCESSING) return null;
      record.status = COMPLETED;
      record.result = result;
      return record;
    },
    async markFailed(scope, idempotencyKey, errorPayload) {
      const k = keyOf(scope, idempotencyKey);
      const record = store.get(k);
      if (!record || record.status !== PROCESSING) return null;
      record.status = FAILED;
      record.result = errorPayload;
      return record;
    },
    async deleteByKey(scope, idempotencyKey) {
      const k = keyOf(scope, idempotencyKey);
      const record = store.get(k);
      if (record?.requestId) {
        requestIndex.delete(record.requestId);
      }
      const had = store.delete(k);
      return { deletedCount: had ? 1 : 0 };
    },
    async deleteStaleProcessing() {
      return 0;
    },
  };
}

describe("MongoIdempotencyService (unit)", () => {
  let repository;
  let service;

  beforeEach(() => {
    repository = createMemoryRepository();
    service = new MongoIdempotencyService({ repository, scope: "test" });
  });

  it("executes handler once and replays on duplicate payload", async () => {
    let runs = 0;
    const payload = { orderId: "o-1", amount: 5000 };

    const first = await service.execute("key-1", payload, async () => {
      runs += 1;
      return { ok: true };
    });

    const second = await service.execute("key-1", payload, async () => {
      runs += 1;
      return { ok: true };
    });

    assert.equal(runs, 1);
    assert.equal(first.replayed, false);
    assert.equal(second.replayed, true);
    assert.deepEqual(second.result, { ok: true });
  });

  it("throws DuplicateRequestError when key reused with different payload", async () => {
    await service.execute("key-2", { a: 1 }, async () => ({ ok: true }));

    await assert.rejects(
      () => service.execute("key-2", { a: 2 }, async () => ({ ok: true })),
      DuplicateRequestError
    );
  });

  it("throws InProgressRequestError when record is PROCESSING", async () => {
    repository.records.set("test::key-3", {
      scope: "test",
      idempotencyKey: "key-3",
      fingerprint: service.fingerprint({ x: 1 }),
      status: PROCESSING,
    });

    await assert.rejects(
      () => service.execute("key-3", { x: 1 }, async () => ({ ok: true })),
      InProgressRequestError
    );
  });

  it("marks record FAILED and allows retry when retryFailed is enabled", async () => {
    repository.records.set("test::key-4", {
      scope: "test",
      idempotencyKey: "key-4",
      fingerprint: service.fingerprint({ retry: true }),
      status: FAILED,
      result: { message: "boom" },
    });

    let runs = 0;
    const outcome = await service.execute("key-4", { retry: true }, async () => {
      runs += 1;
      return { recovered: true };
    });

    assert.equal(runs, 1);
    assert.equal(outcome.replayed, false);
    assert.deepEqual(outcome.result, { recovered: true });
  });

  it("rejects register() synchronous API", () => {
    assert.throws(() => service.register("k", { fingerprint: "x", result: {} }), /not supported/);
  });

  it("marks PROCESSING as FAILED and rethrows when handler throws", async () => {
    await assert.rejects(
      () =>
        service.execute("key-fail", { amount: 1 }, async () => {
          throw new Error("payment failed");
        }),
      /payment failed/
    );

    const record = await repository.findByKey("test", "key-fail");
    assert.equal(record.status, FAILED);
    assert.equal(record.result.message, "payment failed");
  });

  it("throws RequestIdConflictError when requestId is reused with different key", async () => {
    const RequestIdConflictError = require("../errors/RequestIdConflictError");
    await service.execute(
      "key-a",
      { a: 1 },
      async () => ({ ok: true }),
      { requestId: "shared-req-1" }
    );

    await assert.rejects(
      () =>
        service.execute(
          "key-b",
          { b: 2 },
          async () => ({ ok: true }),
          { requestId: "shared-req-1" }
        ),
      RequestIdConflictError
    );
  });
});
