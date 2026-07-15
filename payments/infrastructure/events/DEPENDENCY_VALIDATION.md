# Dependency Validation — Module 5 Event Bus

**Branch:** `feature/payment-foundation`

---

## Dependency Graph

```
createEventBus()
    ├── EventBus
    ├── EventSubscriberRegistry
    └── EventDispatcher

Standalone (not wired to EventBus):
    ├── RetryPolicy / ExponentialBackoffRetryPolicy
    └── EventVersionRegistry
```

---

## Import Rules

| Module | Imports Event Bus? | Event Bus imports it? |
|--------|-------------------|----------------------|
| Idempotency (M1) | ❌ | ❌ |
| Transactions (M2) | ❌ | ❌ |
| Audit (M3) | ❌ | ❌ |
| Payment Engine (M4) | ❌ | ❌ |
| Event Bus (M5) | — | ❌ No foundation imports |
| PaymentModule | ❌ | ❌ |
| Routes/Controllers | ❌ | ❌ |

**Result:** ✅ No circular dependencies

---

## Singleton State

| Component | Global state |
|-----------|--------------|
| EventBus instance | Per factory call |
| EventSubscriberRegistry | Per bus instance |
| EventVersionRegistry | Per instance |
| RetryPolicy | Stateless |

**Result:** ✅ No hidden singletons

---

## Conclusion

Module 5 passes dependency validation. Retry and version registry are opt-in plug-ins for future modules.
