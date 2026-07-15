const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const { createEventBus, EventTypes } = require("../index");

describe("EventBus", () => {
  it("publish dispatches to subscribers automatically", async () => {
    const { bus } = createEventBus();
    const received = [];

    bus.subscribe(EventTypes.PAYMENT_CREATED, async (envelope) => {
      received.push(envelope.eventType);
    });

    await bus.publish({
      eventType: EventTypes.PAYMENT_CREATED,
      aggregateId: "txn-100",
    });

    assert.deepEqual(received, ["PAYMENT_CREATED"]);
  });

  it("supports manual queue and dispatch", async () => {
    const { bus } = createEventBus({ autoDispatch: false });
    const received = [];

    bus.subscribe(EventTypes.TRANSACTION_UPDATED, async (envelope) => {
      received.push(envelope.aggregateId);
    });

    await bus.publish({
      eventType: EventTypes.TRANSACTION_UPDATED,
      aggregateId: "txn-queue",
    });

    assert.equal(bus.inspect().queuedEvents.length, 1);
    await bus.dispatch();
    assert.equal(received.length, 1);
    assert.equal(bus.inspect().queuedEvents.length, 0);
  });

  it("exposes health contract", () => {
    const { bus } = createEventBus();
    bus.subscribe(EventTypes.ESCROW_CREATED, () => {});

    const health = bus.health();
    assert.equal(health.healthy, true);
    assert.equal(health.subscribers, 1);
    assert.equal(health.enabledSubscribers, 1);
    assert.ok(health.version);
    assert.equal(health.queuedEvents, 0);
  });

  it("unsubscribe removes handler", async () => {
    const { bus } = createEventBus();
    let count = 0;
    const id = bus.subscribe(EventTypes.PAYMENT_FAILED, async () => {
      count += 1;
    });

    bus.unsubscribe(id);
    await bus.publish({
      eventType: EventTypes.PAYMENT_FAILED,
      aggregateId: "txn-fail",
    });

    assert.equal(count, 0);
  });

  it("inspect returns bus state", async () => {
    const { bus } = createEventBus({ autoDispatch: false });
    await bus.publish({ eventType: EventTypes.PAYMENT_PENDING, aggregateId: "txn-p" });
    const state = bus.inspect();
    assert.equal(state.queuedEvents.length, 1);
    assert.equal(state.publishedEvents, 1);
  });
});
