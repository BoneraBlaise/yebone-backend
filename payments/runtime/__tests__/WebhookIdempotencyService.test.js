const { describe, it, beforeEach } = require("node:test");
const assert = require("node:assert/strict");
const WebhookIdempotencyService = require("../webhooks/WebhookIdempotencyService");
const WebhookReconciliationResult = require("../webhooks/WebhookReconciliationResult");
const IdempotencyConfig = require("../../infrastructure/idempotency/IdempotencyConfig");

const { PROCESSING, COMPLETED } = IdempotencyConfig.recordStatus;

function createMemoryIdempotencyRepository() {
  const store = new Map();
  const requestIndex = new Map();
  const keyOf = (scope, idempotencyKey) => `${scope || ""}::${idempotencyKey}`;

  return {
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
      const record = { ...input, status: PROCESSING, createdAt: new Date() };
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
    async markFailed() {
      return null;
    },
  };
}

describe("WebhookIdempotencyService", () => {
  let service;

  beforeEach(() => {
    service = WebhookIdempotencyService.create({
      repository: createMemoryIdempotencyRepository(),
    });
  });

  it("deduplicates webhook events by provider event id", async () => {
    const input = {
      providerCode: "MTN_MOMO",
      correlationId: "corr-1",
      payload: { eventId: "evt-dup", reference: "ref-1" },
      verified: true,
    };

    const first = await service.executeOnce(input, async () =>
      WebhookIdempotencyService.wrapResult(
        WebhookReconciliationResult.create({
          accepted: true,
          verified: true,
          reconciled: true,
          correlationId: "corr-1",
        })
      )
    );

    const second = await service.executeOnce(input, async () =>
      WebhookIdempotencyService.wrapResult(
        WebhookReconciliationResult.create({
          accepted: true,
          verified: true,
          reconciled: false,
          correlationId: "corr-1",
        })
      )
    );

    assert.equal(first.reconciled, true);
    assert.equal(second.duplicate, true);
    assert.equal(second.reconciled, true);
  });
});
