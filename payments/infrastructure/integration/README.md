# Module 8 — Payment Integration Gate

Coordinates Modules 1–7 into a single settlement execution flow. **Coordination only** — no new business logic, no provider API, no webhooks, no external HTTP, and **not wired** into `PaymentModule`, routes, or `server.js`.

## Pipeline

```
PaymentEngine (readiness)
        ↓
Idempotency.execute()
        ↓
TransactionService.createTransaction()
        ↓
CommissionEngine.calculate()
        ↓
Ledger.post() — fund escrow + commission release
        ↓
Wallet.project()
        ↓
Audit.record()
        ↓
EventBus.publish()
        ↓
COMPLETE
        ↓
PaymentExecutionResult
```

## Usage (isolated)

```javascript
const { createIntegrationFoundation } = require("./payments/infrastructure/integration");
const FeatureFlagRegistry = require("./payments/infrastructure/engine/FeatureFlagRegistry");

const foundation = createIntegrationFoundation({
  featureFlags: new FeatureFlagRegistry({ paymentEngineEnabled: true }),
  // inject in-memory services for tests, or rely on bootstrap defaults for Mongo-backed modules
});

const result = await foundation.gate.execute({
  orderId: "ord-1",
  buyerId: "buyer-1",
  sellerId: "seller-1",
  amount: 10000,
}, {
  correlationId: "corr-1",
  requestId: "req-1",
});
```

## Dependency rules

- All dependencies injected via `createIntegrationFoundation()` — no singletons
- No imports of `PaymentModule`, routes, controllers, or provider adapters
- `PaymentModuleBridge` enforces the integration boundary at construction time

## Rollback strategy (design only)

No runtime rollback is implemented in Module 8. Compensating actions for partial failures:

| Failure stage | Prior state | Compensating action (future module) |
|---------------|-------------|-------------------------------------|
| **Ledger** | Transaction + commission calculated | Reverse fund journal if posted; mark transaction `FAILED`; idempotency record allows safe retry |
| **Wallet projection** | Ledger posted (balanced) | Ledger remains source of truth; replay wallet projection from ledger; no ledger reversal needed |
| **Audit** | Ledger + wallet projection complete | Retry audit append (idempotent auditId); financial state unchanged |
| **Event publish** | Audit recorded | Retry event publish with same correlationId; subscribers must be idempotent |

## Health

`gate.health()` or `foundation.health()` reports readiness for Engine, Idempotency, Transactions, Commission, Ledger, Wallet, Audit, Events, plus overall `ready` and `version`.

## Version

`8.0.0-integration-gate`
