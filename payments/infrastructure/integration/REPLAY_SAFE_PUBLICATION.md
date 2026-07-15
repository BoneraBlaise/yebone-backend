# Replay-Safe Audit and Event Publication (Design)

Module 8 defines **immutable publication identity rules** for settlement audit and domain events. Runtime deduplication is **not activated** — the pipeline continues to use random `auditId` and `eventId` values today.

## Problem

When an idempotency handler fails after ledger commit and retries successfully, the settlement pipeline may re-run `AUDIT` and `EVENTS` stages. Without deterministic publication identities, duplicate audit records and duplicate `PAYMENT_SETTLED` events can be emitted for the same logical payment.

Transaction and ledger retries are already safe via `SettlementIdentity` and `SettlementRetryGuard`. Audit and events require the same class of protection.

## Immutable audit identity

Derived by `SettlementPublicationIdentity.deriveAuditIdentity()` from:

| Field | Source |
|-------|--------|
| `idempotencyKey` | Settlement trace |
| `action` | e.g. `PAYMENT_SETTLED` |
| `resourceType` | e.g. `TRANSACTION` |
| `resourceId` | `transactionId` |

**Output (frozen):**

- `auditId`: `aud_settle_{sha256-digest-24}`
- `dedupeKey`: `audit:settlement:{digest}`
- `identityVersion`: `1.0`

Same logical settlement → same `auditId` on every retry.

## Immutable event identity

Derived by `SettlementPublicationIdentity.deriveEventIdentity()` from:

| Field | Source |
|-------|--------|
| `idempotencyKey` | Settlement trace |
| `eventType` | e.g. `PAYMENT_SETTLED` |
| `aggregateType` | e.g. `PAYMENT` |
| `aggregateId` | `transactionId` |

**Output (frozen):**

- `eventId`: `evt_settle_{sha256-digest-24}`
- `dedupeKey`: `event:settlement:{digest}`
- `identityVersion`: `1.0`

Same logical settlement → same `eventId` on every retry.

## Future deduplication strategy (Module 9+)

### Audit

1. Pipeline passes `auditId` from `deriveAuditIdentity()` into `AuditService.record()`.
2. `AuditRepository.append()` checks for existing `auditId`.
3. If exists → return existing record (idempotent append, no duplicate row).
4. Unique index on `auditId` enforces constraint at persistence layer.

### Events

1. Pipeline passes `eventId` from `deriveEventIdentity()` into `EventBus.publish()`.
2. Event bus maintains a dedupe registry keyed by `eventId` (in-process, then durable outbox).
3. If exists → return existing `eventId`, skip subscriber dispatch.
4. Subscribers remain idempotent as defense-in-depth.

## Current Module 8 behavior (unchanged)

| Component | Current | Future |
|-----------|---------|--------|
| Audit ID | Random `aud_{uuid}` via `AuditHelper` | Deterministic `aud_settle_{digest}` |
| Event ID | Random `evt_{uuid}` via `DomainEvent` | Deterministic `evt_settle_{digest}` |
| Dedup on retry | None | Identity-based idempotent append/publish |

See `ReplaySafePublicationContract.describe()` for machine-readable contract.

## Activation criteria (Module 9+)

- [ ] Wire `SettlementPublicationIdentity` into `PaymentExecutionPipeline._recordAudit()` and `_publishEvent()`
- [ ] Add `AuditRepository.findByAuditId()` idempotent append path
- [ ] Add `EventBus` publish dedupe registry
- [ ] Integration tests asserting single audit/event per idempotency key across failed retry

No production wiring until explicitly approved.
