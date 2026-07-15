# Audit Migration Strategy — Module 3 Closure

**Branch:** `feature/payment-foundation`  
**Status:** Documentation only — no runtime changes  
**Date:** Module 3 closure review

---

## 1. Current State: Two Audit Systems

The payment stack currently contains **three** audit-related components. Only two are in scope for migration.

| Component | Location | Storage | Wired to PaymentModule |
|-----------|----------|---------|------------------------|
| **FinancialAuditService** | `payments/financial/audit/FinancialAuditService.js` | In-memory array | **Yes** — injected into 10 orchestrators |
| **AuditService (Module 3)** | `payments/infrastructure/audit/AuditService.js` | MongoDB `payment_audit_logs` | **No** — isolated foundation |
| **AuditLogger** | `payments/infrastructure/logging/AuditLogger.js` | In-memory + stdout | Infrastructure module only |

This document covers the migration from **FinancialAuditService** → **AuditService (Module 3)**.

---

## 2. Why Both Exist

### FinancialAuditService (legacy skeleton)

Built during the original payment skeleton phase (~260 files). It exists because:

1. **Orchestrator contract** — All orchestrators (`CheckoutOrchestrator`, `EscrowOrchestrator`, `RefundOrchestrator`, etc.) accept an `auditService` dependency and call category helpers (`recordPayment`, `recordEscrow`, `recordWallet`, …).
2. **Zero infrastructure dependency** — In-memory, no MongoDB, no sanitization. Suitable for skeleton development and unit tests.
3. **PaymentModule default** — `PaymentModule` instantiates `new FinancialAuditService()` when no override is provided.
4. **Production today** — The v1 payment skeleton runs with this service. Records are **lost on process restart** and are **not queryable** across instances.

### AuditService (Module 3 — future production)

Built as payment foundation Module 3 because:

1. **Immutable financial audit trail** — Append-only MongoDB records with schema-level mutation blocking.
2. **Production requirements** — Sanitization, indexes, correlation fields, actor/resource typing.
3. **Single source of truth** — Payment Engine and Event Bus subscribers will persist every financial event here.
4. **Isolation rule** — Module 3 must not affect production until the integration gate (Module 9 wiring phase).

**Conclusion:** Both exist because Module 3 was built **alongside** the skeleton, not **inside** it. The skeleton continues to use the legacy service until a deliberate adapter migration.

---

## 3. Future Production Implementation

| Role | Component |
|------|-----------|
| **Production audit store** | `AuditService` + `AuditRepository` → `payment_audit_logs` |
| **Legacy (deprecated)** | `FinancialAuditService` |
| **Logging only (unchanged)** | `AuditLogger` — operational log lines, not financial audit |

`AuditService` becomes the **authoritative financial audit system**.

---

## 4. Adapter Required: Yes

An adapter is **required** because orchestrators depend on a **different interface**:

```
FinancialAuditService API:
  recordPayment(action, aggregateId, payload, metadata)
  recordRefund(action, aggregateId, payload, metadata)
  recordEscrow(action, aggregateId, payload, metadata)
  ...

AuditService API:
  record({ action, actorId, actorType, resourceType, resourceId, before, after, metadata, context })
  recordFromRequest(req, event)
```

**Recommended adapter:** `FinancialAuditAdapter` (Module 9 — wiring phase, not now)

```
payments/infrastructure/audit/adapters/FinancialAuditAdapter.js   (future)
```

Responsibilities:

| Legacy call | Adapter maps to |
|-------------|-----------------|
| `recordPayment("checkout_started", orderId, payload)` | `action: CHECKOUT_STARTED` or `PAYMENT_CREATED`, `resourceType: ORDER`, `resourceId: orderId` |
| `recordEscrow("escrow_hold", orderId, payload)` | `action: ESCROW_HELD`, `resourceType: ESCROW`, `resourceId: orderId` |
| `recordWallet("wallet_credit", ownerId, payload)` | `action: WALLET_CREDITED`, `resourceType: WALLET`, `resourceId: ownerId` |
| Category + free-form action string | Normalized `AuditAction` enum or validated extensible action |

The adapter must:

- Inject `correlationId`, `requestId` from `AuditContext` / idempotency context
- Run `AuditSanitizer` (already inside `AuditService.record`)
- Map `aggregateId` → `resourceId`
- Infer `resourceType` from category (`payment` → `PAYMENT` or `ORDER`)
- Infer `actorType` from context (default `SYSTEM` for orchestrator-internal calls)
- **Never** expose update/delete

---

## 5. Should FinancialAuditService Become a Wrapper?

**Phase 1 (Module 9 wiring):** No — keep `FinancialAuditService` unchanged. Inject `FinancialAuditAdapter` **as** `options.financialAuditService` into `PaymentModule`. Orchestrators see the same method signatures; adapter delegates to `AuditService`.

**Phase 2 (post-stabilization):** Optionally refactor `FinancialAuditService` into a thin deprecated facade:

```javascript
// Future — NOT implemented now
class FinancialAuditService {
  constructor({ auditService, context }) {
    this._adapter = new FinancialAuditAdapter({ auditService, context });
  }
  recordPayment(...args) { return this._adapter.recordPayment(...args); }
  // ...
}
```

**Recommendation:** Do **not** modify `FinancialAuditService` source during foundation modules. Use adapter injection only. Deprecation is a **documentation + JSDoc** marker until orchestrators are rewritten to call `AuditService` directly (Module 10+ cleanup).

---

## 6. Deprecation Plan

| Phase | FinancialAuditService | AuditService |
|-------|----------------------|--------------|
| **Now (Modules 1–3)** | Active in PaymentModule | Built, isolated |
| **Module 4–8** | Active in PaymentModule | Available, still not wired |
| **Module 9 (integration gate)** | Deprecated via adapter injection | Production audit |
| **Module 10+** | Remove or keep as test double | Sole production implementation |

Add `@deprecated Use AuditService via FinancialAuditAdapter` JSDoc at integration gate — **not before**.

---

## 7. Migration Strategy (Step-by-Step)

### Step 1 — Module 4: Event Bus (no audit wiring)

Event Bus publishes domain events. Audit does not subscribe yet.

### Step 2 — Module 5: Payment Engine

Payment Engine calls `AuditService.record()` synchronously for critical path events (`PAYMENT_CREATED`, `PAYMENT_CAPTURED`). Still independent of PaymentModule.

### Step 3 — Module 6–8: Wallet, Provider Registry, MTN MoMo

Each module publishes events. Audit timeline grows via Event Bus subscriber (see Event Bus strategy below).

### Step 4 — Module 9: Integration gate

1. Create `FinancialAuditAdapter` implementing legacy method signatures.
2. Bootstrap: `createAuditFoundation()` → inject adapter as `financialAuditService`.
3. Enable Event Bus `AuditEventSubscriber` for async derived events.
4. Run dual-write validation period (optional): adapter writes to MongoDB only; compare orchestrator call counts in staging.
5. Mark `FinancialAuditService` deprecated in docs.

### Step 5 — Module 10+: Orchestrator refactor

Replace category helpers with direct `AuditService.record()` calls. Remove adapter when all orchestrators migrated.

**No data migration required** — in-memory `FinancialAuditService` records were never persisted.

---

## 8. Payment Engine Integration Strategy

```
PaymentEngine.charge(request)
  │
  ├─► IdempotencyService.execute(key, payload, handler)
  │     context: { correlationId, requestId, paymentReference }
  │
  ├─► TransactionService.createTransaction(...)
  │
  ├─► AuditService.record({                    ← synchronous, critical path
  │       action: PAYMENT_CREATED,
  │       resourceType: TRANSACTION,
  │       resourceId: transactionId,
  │       context: { correlationId, requestId },
  │       after: { status: CREATED }
  │     })
  │
  ├─► ProviderRegistry → ProviderAdapter.charge()
  │
  ├─► TransactionService.transitionStatus(...)
  │
  └─► EventBus.publish(PaymentTransactionStatusChanged)   ← async fan-out
```

**Rules:**

| Rule | Rationale |
|------|-----------|
| Payment Engine **owns** synchronous audit for state transitions it performs | Guarantees audit exists before response |
| Payment Engine **never** reads audit for business decisions | Audit is derived, not authoritative |
| Audit failures on critical path | Log + fail open vs fail closed — **decision at Module 5** (recommend: fail open with alert for non-blocking audit, fail closed for compliance events) |
| `before` / `after` snapshots | Capture transaction status delta on each transition |

---

## 9. Event Bus Integration Strategy

```
Domain Event Published
  │
  ▼
EventBus
  │
  ├─► AuditEventSubscriber (Module 9+)     ← primary async audit path
  │     maps event → AuditService.record()
  │
  ├─► WalletEventSubscriber
  │
  └─► NotificationEventSubscriber
```

**Division of responsibility:**

| Audit source | When | Examples |
|--------------|------|----------|
| **Synchronous (Payment Engine)** | Critical path, must exist before ACK | `PAYMENT_CREATED`, `PAYMENT_CAPTURED`, `PAYMENT_FAILED` |
| **Async (Event Bus subscriber)** | Derived side effects | `WALLET_CREDITED`, `ESCROW_HELD`, `PAYOUT_COMPLETED`, `SETTLEMENT_COMPLETED` |

**AuditEventSubscriber design (future):**

- Idempotent by `(correlationId, action, resourceId)` — use idempotency layer or dedup key in metadata
- Never calls back into Payment Engine or TransactionService
- Maps event payload → sanitized `before`/`after`
- Propagates `correlationId`, `requestId`, `traceId` from event envelope

**Event envelope (Module 4 contract preview):**

```javascript
{
  eventId,           // unique per emission
  eventType,         // e.g. PaymentCaptured
  correlationId,     // immutable per business flow
  requestId,         // originating request (may differ per retry)
  traceId,           // distributed trace root
  transactionId,
  paymentReference,
  providerReference,
  payload,           // sanitized domain data
  occurredAt
}
```

---

## 10. AuditLogger — No Migration

`AuditLogger` serves infrastructure/ops logging (stdout). It is **not** a financial audit system. Keep separate permanently.

---

## 11. Orchestrator Inventory (Legacy Call Sites)

All call `this.auditService.*` today — will receive adapter at integration gate:

| Orchestrator | Category methods used |
|--------------|----------------------|
| `CheckoutOrchestrator` | `recordPayment` |
| `OrderTransactionOrchestrator` | `recordPayment`, `recordRefund` |
| `EscrowOrchestrator` | `recordEscrow` |
| `RefundOrchestrator` | `recordRefund` |
| `WalletOrchestrator` | `recordWallet` |
| `VendorPayoutOrchestrator` | `recordPayout` |
| `VendorSubscriptionOrchestrator` | `recordSubscription` |
| `DeliveryPaymentOrchestrator` | `recordSettlement` |
| `SettlementOrchestrator` | `recordSettlement` |
| `TransactionCoordinator` | `recordPayment`, `recordRefund`, `recordPayout` |
| `SettlementEngine` | `recordSettlement` |

**Total:** 11 components, ~40 audit call sites (approximate).

---

## 12. Risk Summary

| Risk | Mitigation |
|------|------------|
| Adapter mapping errors | Contract tests mapping each legacy call → audit record shape |
| Missing correlation context in orchestrators | Adapter pulls from `req.idempotencyContext` or generates UUID |
| Dual audit during transition | Single injection point in PaymentModule — no double-write to both systems |
| Performance (MongoDB append) | Async path via Event Bus for non-critical events |

---

## 13. Explicit Non-Actions (This Closure)

- ❌ Do not delete `FinancialAuditService`
- ❌ Do not rename any class
- ❌ Do not wire `AuditService` into `PaymentModule`
- ❌ Do not create adapter file yet (documented only)
- ❌ Do not modify orchestrators
