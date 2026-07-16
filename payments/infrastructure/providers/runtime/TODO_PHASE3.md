# Module 10 — Phase 3 Backlog

**Baseline:** `payment-foundation-v3`  
**Branch:** `feature/payment-foundation`  
**Status:** Sprint 1 complete — Provider Execution Integration Foundation implemented (awaiting approval)

Provider execution must **NOT** be placed inside the Module 8 Integration Gate settlement pipeline (ADR-004).

---

## Scope Principle

Phase 3 Sprint 1 delivers **`ProviderExecutionOrchestrator`** with full operation surface (`charge`, `verify`, `payout`, `refund`), **`ExecutionResult`** boundary, diagnostics attachment, and optional **`PaymentEngine`** injection — still foundation only, not production wiring.

---

## Sprint 1 Deliverables ✓

| Item | Status |
|------|--------|
| `ProviderExecutionOrchestrator` — constructor injection only (ADR-008) | ✓ |
| `charge()`, `verify()`, `payout()`, `refund()` | ✓ |
| `ExecutionResult` + `createExecutionResult()` | ✓ |
| `ExecutionTimeline` + `ProviderRuntimeDiagnostics` attachment | ✓ |
| `RuntimeFactory.createProviderExecutionOrchestrator()` | ✓ |
| Optional `PaymentEngine` orchestrator injection | ✓ |
| Unit + regression tests | ✓ |

**Not in Sprint 1:** PaymentModule wiring, production rollout, Integration Gate changes, feature flag default changes.

---

## Deferred (post–Sprint 1 — documentation only, not implemented)

### TODO — Inject CorrelationContextFactory

**Purpose:** Replace lightweight self-instantiation of `CorrelationContext` inside `ProviderExecutionOrchestrator`.

**Status:** Deferred (see ADR-009).

---

### TODO — Inject ProviderRuntimeDiagnosticsFactory

**Purpose:** Replace lightweight self-instantiation of `ProviderRuntimeDiagnosticsCollector` inside `ProviderExecutionOrchestrator`.

**Status:** Deferred (see ADR-009).

---

## ProviderExecutionOrchestrator (architecture)

**Role:** Coordinate injected collaborators. **Never** create dependencies.

### Constructor (frozen for WP-1)

```javascript
ProviderExecutionOrchestrator({
  providerAdapterResolver,      // Module 9 — descriptor + skeleton adapter
  runtimeAdapterResolver,       // Module 10 — ExecutionDecision authority
  runtimeExecutionGuard,        // Module 10 — sandbox safety asserts
  providerCapabilityValidator, // Module 9 — operation capability check
})
```

### Prohibited

- `new RuntimeFactory()` or any `RuntimeFactory.create*()` call inside orchestrator
- Service Locator / singleton access / hidden `require()` for deps
- Instantiating adapters, guards, resolvers, or validators

### Composition (ADR-008)

```
RuntimeFactory                    ← ONLY composition root (creates all deps)
        │
        ▼
RuntimeBootstrap                  ← composes RuntimeFactory + registration
        │
        ▼
ProviderExecutionOrchestrator     ← consumes injected deps only
```

`ProviderExecutionOrchestrator` **never** depends directly on `RuntimeFactory`.

---

## ExecutionResult (architecture — WP-1)

**Purpose:** Single immutable public boundary object returned by `ProviderExecutionOrchestrator`.  
**Rule:** `PaymentEngine` must never inspect runtime internals to determine success.

### Schema (frozen for WP-1)

```javascript
ExecutionResult = Object.freeze({
  success,               // boolean — orchestration success only (not provider HTTP semantics alone)
  providerResponse,        // ProviderResponse | null
  executionDecision,       // ExecutionDecision — from RuntimeAdapterResolver only
  executionTimeline,       // ExecutionTimeline snapshot
  diagnostics,             // ProviderRuntimeDiagnostics snapshot
  executionMode,           // "MOCK" | "RUNTIME_SANDBOX"
  correlationId,           // string
});
```

Factory: `createExecutionResult({ ... })` — validates required fields, returns frozen object.

- `success: true` — orchestration completed; adapter invoked; normalized response available
- `success: false` — guard rejection, capability failure, or adapter error mapped to result (no throw across boundary unless unrecoverable)

`PaymentEngine` reads `ExecutionResult.success` and `ExecutionResult.providerResponse` — never `executionTimeline` or `diagnostics` internals (WP-5 may expose redacted snapshots only).

---

## Dependency Graph (WP-1)

```
RuntimeFactory
  ├── creates: credentialStore, httpClient, runtime adapters, ...
  ├── creates: RuntimeExecutionGuard
  ├── creates: RuntimeAdapterResolver (when registries supplied)
  ├── creates: ProviderCapabilityValidator (or receives from Module 9 bootstrap)
  └── creates: ProviderExecutionOrchestrator (injected deps only)
        │
        ▼
RuntimeBootstrap
  └── createRuntimeFoundation() / createProviderExecutionOrchestrator()
        │
        ▼
ProviderExecutionOrchestrator
  ├── ProviderAdapterResolver      (injected)
  ├── RuntimeAdapterResolver       (injected)
  ├── RuntimeExecutionGuard        (injected)
  └── ProviderCapabilityValidator  (injected)

ProviderExecutionOrchestrator ──X── RuntimeFactory  (NO direct dependency)
```

---

## Execution Flow (WP-1 — charge only)

```
ProviderExecutionOrchestrator.charge(input, trace)
  │
  │  [orchestrator creates NOTHING — coordinates injected deps only]
  │
  ├── 1. Resolve descriptor
  │       providerAdapterResolver.resolve(...)
  │
  ├── 2. Resolve execution mode
  │       runtimeAdapterResolver.resolve(...) → ExecutionDecision
  │
  ├── 3. Guard validation
  │       runtimeExecutionGuard.assert*()
  │
  ├── 4. Capability validation
  │       providerCapabilityValidator.validate(...)
  │
  ├── 5. Execute adapter
  │       decision.adapter.charge(input)   [from ExecutionDecision — not constructed here]
  │
  └── 6. Create immutable ExecutionResult
          createExecutionResult({ success, providerResponse, executionDecision, ... })
        │
        └── 7. Return ExecutionResult

NOT in WP-1:
  ✗ diagnostics attachment
  ✗ timeline attachment
  ✗ PaymentEngine wiring
  ✗ verify() / payout() / refund()
```

---

## Work Packages

### WP-1 — Orchestrator: charge() only ✓ NEXT

- `ProviderExecutionOrchestrator` — constructor injection only (ADR-008)
- `charge()` only
- `ExecutionResult` + `createExecutionResult()` (includes `success`)
- Unit tests with **mock injected** resolvers/guard/validator
- **No** PaymentEngine wiring
- **No** diagnostics / timeline attachment

**Exit:** `PHASE3_EXIT_CRITERIA.md` — WP-1

---

### WP-2 — verify()

- `ProviderExecutionOrchestrator.verify()` — same injection pattern
- Returns `ExecutionResult`

---

### WP-3 — payout()

- `ProviderExecutionOrchestrator.payout()`
- Returns `ExecutionResult`

---

### WP-4 — refund()

- `ProviderExecutionOrchestrator.refund()` (provider support only)
- Returns `ExecutionResult`

---

### WP-5 — Diagnostics attachment

- Populate `executionTimeline` and `diagnostics` on `ExecutionResult`
- Redaction on exported snapshots

---

### WP-6 — Regression, documentation freeze, Enterprise Review

- Optional PaymentEngine injection
- Tag `payment-foundation-v4` (after approval)

---

## Integration Gate (unchanged)

```
ENGINE → IDEMPOTENCY → TRANSACTION → COMMISSION → LEDGER → WALLET → AUDIT → EVENTS → COMPLETE
```

---

## Canonical references

| Document | Purpose |
|----------|---------|
| `PHASE3_ENTRY_CRITERIA.md` | Gate before implementation |
| `PHASE3_EXIT_CRITERIA.md` | Completion criteria per WP |
| `ROLLBACK_CRITERIA.md` | Revert to v3 triggers |
| `ARCHITECTURE_DECISIONS.md` | ADR-001 through ADR-011 |
