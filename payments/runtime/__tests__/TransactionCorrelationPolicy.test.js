const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const TransactionCorrelationPolicy = require("../webhooks/TransactionCorrelationPolicy");

describe("TransactionCorrelationPolicy", () => {
  it("preserves correlationId through enrichment", () => {
    const chain = TransactionCorrelationPolicy.fromWebhookInput({
      correlationId: "corr-1",
      payload: { reference: "ref-1", eventId: "evt-1" },
    });

    const enriched = TransactionCorrelationPolicy.enrich(chain, {
      transactionId: "txn-1",
      eventId: "event-1",
    });

    assert.equal(enriched.correlationId, "corr-1");
    assert.equal(enriched.transactionId, "txn-1");
    assert.equal(enriched.eventId, "event-1");
  });

  it("forbids replacing correlationId", () => {
    const chain = TransactionCorrelationPolicy.create({ correlationId: "corr-1" });
    assert.throws(() => {
      TransactionCorrelationPolicy.enrich(chain, { correlationId: "corr-2" });
    }, /forbids replacing correlationId/);
  });

  it("maps idempotency metadata to the same correlationId", () => {
    const chain = TransactionCorrelationPolicy.create({
      correlationId: "corr-abc",
      providerEventId: "evt-99",
    });
    const meta = TransactionCorrelationPolicy.toIdempotencyMetadata(chain);
    assert.equal(meta.correlationId, "corr-abc");
    assert.equal(meta.metadata.correlationId, "corr-abc");
  });

  it("establishes charge correlation and preserves it through link application", () => {
    const chain = TransactionCorrelationPolicy.fromChargeRequest({
      input: { orderId: "order-1" },
      trace: { correlationId: "corr-charge-1" },
    });
    const link = {
      correlationId: "corr-charge-1",
      module2TransactionId: "txn-1",
      providerReference: "prov-1",
    };
    const merged = TransactionCorrelationPolicy.fromWebhookInput({
      correlationId: "corr-http-other",
      link,
      payload: { reference: "prov-1" },
    });
    assert.equal(merged.correlationId, "corr-charge-1");
    assert.equal(merged.transactionId, "txn-1");
  });
});
