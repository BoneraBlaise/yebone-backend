# Phase 3 Exit Criteria

**Purpose:** Completion checklists per work package and overall Phase 3 freeze.

---

## Sprint 1 Exit Criteria — Provider Execution Integration Foundation ✓

Sprint 1 is complete when **all** of the following are true:

### Orchestrator

- [x] `ProviderExecutionOrchestrator` exists with `charge()`, `verify()`, `payout()`, `refund()`
- [x] **Constructor injection exclusively** — four injected deps
- [x] **No** internal composition root calls
- [x] **No** Service Locator, singleton access, or hidden dependency creation

### ExecutionResult

- [x] `ExecutionResult` + `createExecutionResult()` implemented
- [x] **`success` field present** — orchestration success only
- [x] `ExecutionResult` is the **only** orchestrator return type
- [x] `executionTimeline` and `diagnostics` populated

### Safety & authority

- [x] `RuntimeFactory` remains sole composition root
- [x] `RuntimeAdapterResolver` remains sole authority for `ExecutionDecision`
- [x] `RuntimeExecutionGuard` enforced on every RUNTIME_SANDBOX path
- [x] Mock fallback honored when `executionMode === "MOCK"`

### Scope boundaries

- [x] Optional PaymentEngine wiring (not mandatory)
- [x] **No** PaymentModule / route / server wiring
- [x] Integration Gate unchanged

### Tests

- [x] Unit tests use mock injected dependencies
- [x] Regression passing (`npm run test:providers:all` — 223/223)
- [x] Feature flags remain default OFF; runtime sandbox-only

---

## WP-1 Exit Criteria — charge() only (superseded by Sprint 1)

WP-1 is complete when **all** of the following are true:

### Orchestrator

- [ ] `ProviderExecutionOrchestrator` exists with **`charge()` only**
- [ ] **Constructor injection exclusively** — four injected deps:
  - `providerAdapterResolver`
  - `runtimeAdapterResolver`
  - `runtimeExecutionGuard`
  - `providerCapabilityValidator`
- [ ] **No** internal `RuntimeFactory` calls
- [ ] **No** Service Locator, singleton access, or hidden dependency creation
- [ ] Orchestrator **coordinates only** — does not create adapters, guards, resolvers, or validators

### ExecutionResult

- [ ] `ExecutionResult` + `createExecutionResult()` implemented
- [ ] **`success` field present** — orchestration success only
- [ ] `ExecutionResult` is the **only** orchestrator return type
- [ ] `executionTimeline: null` and `diagnostics: null` in WP-1

### Safety & authority

- [ ] `RuntimeFactory` remains sole composition root (orchestrator created by factory/bootstrap)
- [ ] `RuntimeAdapterResolver` remains sole authority for `ExecutionDecision`
- [ ] `RuntimeExecutionGuard` enforced on every RUNTIME_SANDBOX path
- [ ] Mock fallback honored when `executionMode === "MOCK"`

### Scope boundaries

- [ ] `verify()`, `payout()`, `refund()` **not** implemented
- [ ] **No** diagnostics attachment
- [ ] **No** timeline attachment
- [ ] **No** PaymentEngine wiring
- [ ] **No** production wiring
- [ ] Integration Gate unchanged

### Tests

- [ ] Unit tests use mock **injected** dependencies
- [ ] Existing regression passes (`npm run test:providers:all` — 206/206)
- [ ] Feature flags remain default OFF; runtime sandbox-only

---

## WP-2 Exit Criteria — verify()

- [ ] `ProviderExecutionOrchestrator.verify()` — same constructor injection pattern
- [ ] Returns `ExecutionResult` (with `success`)
- [ ] Unit tests pass; regression clean

---

## WP-3 Exit Criteria — payout()

- [ ] `ProviderExecutionOrchestrator.payout()`
- [ ] Returns `ExecutionResult`
- [ ] Unit tests pass; regression clean

---

## WP-4 Exit Criteria — refund()

- [ ] `ProviderExecutionOrchestrator.refund()`
- [ ] Returns `ExecutionResult`
- [ ] Unit tests pass; regression clean

---

## WP-5 Exit Criteria — diagnostics

- [ ] `executionTimeline` and `diagnostics` populated on `ExecutionResult`
- [ ] Redacted exports; `PaymentEngine` still uses `success` + `providerResponse` only

---

## WP-6 Exit Criteria — Phase 3 freeze

- [ ] All WP-1 through WP-5 exit criteria met
- [ ] Full regression passing
- [ ] Enterprise Review approved
- [ ] Ready for tag `payment-foundation-v4`

---

## Phase 3 Overall Exit (payment-foundation-v4)

| Area | Requirement |
|------|-------------|
| Orchestration | charge, verify, payout, refund via `ExecutionResult` |
| Injection | ADR-008 enforced — constructor injection only |
| Safety | Guards enforced; flags OFF; sandbox-only |
| Boundaries | No Integration Gate / PaymentModule / route wiring |
| Tests | All regression + Phase 3 suites pass |
