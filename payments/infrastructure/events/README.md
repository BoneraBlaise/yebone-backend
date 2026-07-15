# Module 5 — Payment Domain Event Bus Foundation

In-process publish/subscribe event bus for payment domain events.

## Scope

- `publish()`, `subscribe()`, `unsubscribe()`, `dispatch()`, `inspect()`, `health()`
- Event envelope validation
- Subscriber registry with priority, once-only, enable/disable
- **No** Redis, RabbitMQ, Kafka, or external messaging
- **Not wired** into PaymentModule, PaymentEngine, routes, or production runtime

## Usage

```javascript
const { createEventBus, EventTypes } = require("./payments/infrastructure/events");

const { bus } = createEventBus();

bus.subscribe(EventTypes.PAYMENT_CAPTURED, async (envelope) => {
  console.log(envelope.aggregateId);
});

await bus.publish({
  eventType: EventTypes.PAYMENT_CAPTURED,
  aggregateId: "txn_123",
  payload: { status: "CAPTURED" },
});
```

## Manual dispatch mode

```javascript
const { bus } = createEventBus({ autoDispatch: false });
bus.publish({ eventType: "PAYMENT_CREATED", aggregateId: "txn-1" });
await bus.dispatch();
```

## Health

```javascript
bus.health();
// { healthy, subscribers, registeredEvents, enabledSubscribers, version, queuedEvents, publishedEvents }
```

## Tests

```bash
npm run test:events:all
```

## Related docs

- [Retry Policy Design](./RETRY_POLICY_DESIGN.md)
- [Event Version Registry](./EVENT_VERSION_REGISTRY.md)
- [Dependency Validation](./DEPENDENCY_VALIDATION.md)
- [Module 5 Closure](./MODULE_5_CLOSURE.md)
- [Payment Foundation Architecture](../PAYMENT_FOUNDATION_ARCHITECTURE.md)
