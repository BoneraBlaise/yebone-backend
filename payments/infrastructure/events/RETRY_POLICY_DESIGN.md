# Retry Policy Design — Module 5 Closure

**Branch:** `feature/payment-foundation`  
**Status:** Architecture only — no retry execution wired

---

## Purpose

Allow future modules (dispatch workers, webhook reconcilers, outbox processors) to plug retry behavior **without modifying `EventBus`**.

---

## Contract

```javascript
class RetryPolicy {
  shouldRetry({ attempt, error, envelope })  // boolean
  maxAttempts()                               // number
  nextDelay({ attempt, error, envelope })     // ms
  onFailure({ attempt, error, envelope })     // observability hook
}
```

Validation: `RetryPolicy.assertImplements(policy)`

---

## Reference Implementation

`ExponentialBackoffRetryPolicy` — exponential delay with jitter, optional retriable error codes.

**Not executed by EventBus.** Provided as DI-ready example.

---

## Future Integration (Module 6+)

```
EventDispatcher.dispatch(envelope)
  └── on handler error:
        retryExecutor.run(policy, context, () => handler(envelope))
```

| Component | Role |
|-----------|------|
| `EventBus` | Unchanged — publish/subscribe only |
| `RetryPolicy` | Injected into future `RetryExecutor` |
| `RetryExecutor` | Module 6+ — owns sleep/retry loop |

---

## Design Rules

1. Policies are **stateless** — attempt count passed via context
2. `onFailure()` is terminal — no automatic retry inside policy
3. Multiple policies can coexist (per event type, per subscriber)
4. No MongoDB/Redis in policy layer

---

## Files

| File | Role |
|------|------|
| `RetryPolicy.js` | Abstract contract |
| `ExponentialBackoffRetryPolicy.js` | Reference policy |
