# Engine Health Contract — Module 4 Closure

**Branch:** `feature/payment-foundation`  
**Method:** `PaymentEngine.health()`  
**External calls:** None

---

## Purpose

Self-diagnostic readiness check for the Payment Engine bootstrap. Validates that all injected foundation dependencies are present and callable. Does **not** indicate production activation — `paymentEngineEnabled` may be `false` while `healthy` is `true`.

---

## API

```javascript
const { createPaymentEngineBootstrap } = require("./payments/infrastructure/engine");

const { engine } = createPaymentEngineBootstrap({ /* injected mocks or foundation */ });
const report = engine.health();
```

---

## Response Schema

| Field | Type | Description |
|-------|------|-------------|
| `healthy` | boolean | `true` when all internal dependencies are ready |
| `paymentEngineEnabled` | boolean | Feature flag — default `false` |
| `idempotency` | `"ready"` \| `"missing"` | IdempotencyService has `execute()` |
| `transactionService` | `"ready"` \| `"missing"` | TransactionService has `createTransaction()` |
| `auditService` | `"ready"` \| `"missing"` | AuditService has `record()` |
| `providerRegistry` | `"ready"` \| `"missing"` | Registry attached to resolver |
| `providerResolver` | `"ready"` \| `"missing"` | Resolver present |
| `providersRegistered` | number | Count of registered provider descriptors |
| `providersEnabled` | number | Count with `enabled: true` |
| `version` | string | Engine bootstrap version from `PaymentEngineConfig` |
| `foundationModules` | object | `{ idempotency, transactions, audit }` booleans |
| `featureFlags` | object | Full feature flag snapshot |
| `checkedAt` | ISO string | Timestamp of check |

---

## Example (defaults OFF)

```json
{
  "healthy": true,
  "paymentEngineEnabled": false,
  "idempotency": "ready",
  "transactionService": "ready",
  "auditService": "ready",
  "providerRegistry": "ready",
  "providerResolver": "ready",
  "providersRegistered": 5,
  "providersEnabled": 0,
  "version": "4.0.0-bootstrap",
  "foundationModules": {
    "idempotency": true,
    "transactions": true,
    "audit": true
  }
}
```

---

## Rules

1. **No external API calls** — MongoDB, providers, HTTP never contacted
2. **No side effects** — read-only introspection
3. **`healthy` ≠ production active** — engine may be structurally ready but disabled by flags
4. **`getHealth()` deprecated** — retained for bootstrap compatibility; use `health()`

---

## Implementation

`EngineHealthContract.build(engine)` in `payments/infrastructure/engine/EngineHealthContract.js`
