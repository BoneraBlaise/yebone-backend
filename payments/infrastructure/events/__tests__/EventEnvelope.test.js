const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const EventEnvelope = require("../EventEnvelope");
const EventValidationError = require("../errors/EventValidationError");
const { EventTypes } = require("../EventTypes");

describe("EventEnvelope", () => {
  it("creates a valid envelope with required fields", () => {
    const envelope = EventEnvelope.create({
      eventType: EventTypes.PAYMENT_CREATED,
      aggregateId: "txn-1",
      payload: { amount: 1000 },
    });

    assert.equal(envelope.eventType, "PAYMENT_CREATED");
    assert.equal(envelope.aggregateId, "txn-1");
    assert.ok(envelope.eventId.startsWith("evt_"));
    assert.ok(envelope.correlationId);
    assert.ok(envelope.requestId);
    assert.ok(envelope.timestamp instanceof Date);
  });

  it("rejects missing aggregateId", () => {
    assert.throws(
      () => EventEnvelope.create({ eventType: EventTypes.PAYMENT_FAILED }),
      EventValidationError
    );
  });

  it("serializes to JSON with ISO timestamp", () => {
    const envelope = EventEnvelope.create({
      eventType: EventTypes.TRANSACTION_CREATED,
      aggregateId: "txn-json",
    });
    const json = EventEnvelope.toJSON(envelope);
    assert.equal(json.eventType, "TRANSACTION_CREATED");
    assert.match(json.timestamp, /^\d{4}-\d{2}-\d{2}T/);
  });
});
