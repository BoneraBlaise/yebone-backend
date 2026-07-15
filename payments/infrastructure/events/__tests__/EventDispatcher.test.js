const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const EventDispatcher = require("../EventDispatcher");
const EventSubscriberRegistry = require("../EventSubscriberRegistry");
const EventEnvelope = require("../EventEnvelope");
const { EventTypes } = require("../EventTypes");

describe("EventDispatcher", () => {
  it("dispatches to handlers in priority order", async () => {
    const registry = new EventSubscriberRegistry();
    const calls = [];

    registry.subscribe(EventTypes.PAYMENT_SETTLED, () => calls.push("second"), { priority: 50 });
    registry.subscribe(EventTypes.PAYMENT_SETTLED, () => calls.push("first"), { priority: 1 });

    const dispatcher = new EventDispatcher({ registry });
    const envelope = EventEnvelope.create({
      eventType: EventTypes.PAYMENT_SETTLED,
      aggregateId: "txn-dispatch",
    });

    const count = await dispatcher.dispatch(envelope);
    assert.equal(count, 2);
    assert.deepEqual(calls, ["first", "second"]);
  });

  it("removes once-only handlers after dispatch", async () => {
    const registry = new EventSubscriberRegistry();
    registry.subscribe(EventTypes.PAYOUT_REQUESTED, () => {}, { once: true });

    const dispatcher = new EventDispatcher({ registry });
    const envelope = EventEnvelope.create({
      eventType: EventTypes.PAYOUT_REQUESTED,
      aggregateId: "pay-1",
    });

    await dispatcher.dispatch(envelope);
    assert.equal(registry.getHandlers(EventTypes.PAYOUT_REQUESTED).length, 0);
  });
});
