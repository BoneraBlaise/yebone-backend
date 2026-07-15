const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const EventSubscriberRegistry = require("../EventSubscriberRegistry");
const SubscriberNotFoundError = require("../errors/SubscriberNotFoundError");
const { EventTypes } = require("../EventTypes");

describe("EventSubscriberRegistry", () => {
  it("registers subscribers with priority ordering", () => {
    const registry = new EventSubscriberRegistry();
    const calls = [];

    registry.subscribe(EventTypes.PAYMENT_CAPTURED, () => calls.push("low"), { priority: 200 });
    registry.subscribe(EventTypes.PAYMENT_CAPTURED, () => calls.push("high"), { priority: 10 });

    const handlers = registry.getHandlers(EventTypes.PAYMENT_CAPTURED);
    assert.equal(handlers.length, 2);
    assert.equal(handlers[0].priority, 10);
  });

  it("supports enable and disable", () => {
    const registry = new EventSubscriberRegistry();
    const id = registry.subscribe(EventTypes.WALLET_CREDITED, () => {});
    registry.disable(id);
    assert.equal(registry.getHandlers(EventTypes.WALLET_CREDITED).length, 0);
    registry.enable(id);
    assert.equal(registry.getHandlers(EventTypes.WALLET_CREDITED).length, 1);
  });

  it("removes once-only subscribers after dispatch hook", () => {
    const registry = new EventSubscriberRegistry();
    const id = registry.subscribe(EventTypes.PAYOUT_COMPLETED, () => {}, { once: true });
    registry.removeOnceHandled(id, EventTypes.PAYOUT_COMPLETED);
    assert.equal(registry.getHandlers(EventTypes.PAYOUT_COMPLETED).length, 0);
  });

  it("unsubscribe throws when subscriber is missing", () => {
    const registry = new EventSubscriberRegistry();
    assert.throws(() => registry.unsubscribe("missing"), SubscriberNotFoundError);
  });

  it("lists registered subscribers", () => {
    const registry = new EventSubscriberRegistry();
    registry.subscribe(EventTypes.AUDIT_RECORDED, () => {}, { name: "audit-sub" });
    const list = registry.list();
    assert.equal(list.length, 1);
    assert.equal(list[0].eventType, "AUDIT_RECORDED");
  });
});
