# Phase 3 Entry Criteria

**Purpose:** Checklist that **must** be satisfied before any Phase 3 implementation begins.

This document is a gate only. It defines prerequisites — not scope, design, or implementation.

**Canonical references before Phase 3:**

- `ARCHITECTURE_DECISIONS.md` — why Module 10 is structured as it is
- `ARCHITECTURE_PHASE2.md` — Phase 2 target architecture
- `TODO_PHASE3.md` — Phase 3 backlog (not started until this checklist is complete)

---

## Repository

- [ ] Phase 2 (WP-1 through WP-5) committed to the approved branch
- [ ] Git tag `payment-foundation-v3` exists and points to the approved Phase 2 commit
- [ ] Working tree clean (no uncommitted runtime or production changes)
- [ ] Branch reviewed and approved for merge per release process

---

## Validation

- [ ] Module 9 provider foundation tests passing (`npm run test:providers`)
- [ ] Module 10 runtime tests passing (`npm run test:providers:runtime`)
- [ ] Combined provider suites passing (`npm run test:providers:all`)
- [ ] Security validation passing (redaction, credential isolation, guard hardening — see WP-4 test suite)
- [ ] Observability validation passing (`ExecutionTimeline`, `ProviderRuntimeDiagnostics`, metrics — see WP-4 test suite)
- [ ] Architecture verification passing (`npm run verify:architecture`)
- [ ] Enterprise Review approved for Phase 2 commit
- [ ] No open P0/P1 defects blocking Phase 3 entry

---

## Architecture

- [ ] `RuntimeFactory` remains the only composition root for provider runtime object graphs
- [ ] `RuntimeAdapterRegistry` remains parallel to `ProviderAdapterRegistry` (Module 9)
- [ ] `RuntimeAdapterResolver` remains the single authority for `ExecutionDecision`
- [ ] Module 9 owns contracts; Module 10 consumes only (no duplicated contract logic)
- [ ] Module 8 Integration Gate pipeline unchanged:
  ```
  ENGINE → IDEMPOTENCY → TRANSACTION → COMMISSION → LEDGER → WALLET → AUDIT → EVENTS → COMPLETE
  ```
- [ ] No `ProviderExecutionStage` (or equivalent) added to Integration Gate
- [ ] `PaymentEngine` still not wired to Module 10 runtime
- [ ] No runtime execution inside Module 8 settlement pipeline
- [ ] Phase 3 design reviewed against `ARCHITECTURE_DECISIONS.md` (especially ADR-004)

---

## Runtime

- [ ] Runtime feature flags default **OFF** (`runtimeSandboxEnabled`, `mtnRuntimeEnabled`, `paypackRuntimeEnabled`)
- [ ] Runtime remains sandbox-only unless explicitly approved otherwise in Phase 3 design
- [ ] `liveExecutionEnabled` remains `false` by default in `RuntimeConfig`
- [ ] `PAYMENT_RUNTIME_LIVE` remains blocked by `RuntimeExecutionGuard`
- [ ] No production provider endpoints enabled in default configuration
- [ ] Live HTTP remains blocked unless transport is explicitly injected (tests/harness only)
- [ ] Secret manager and vault remain no-op until explicitly approved for production backends

---

## Production

- [ ] Production behavior unchanged by Phase 2 commit (no user-facing payment flow changes)
- [ ] No `PaymentModule` wiring to Module 10 runtime
- [ ] No route wiring to runtime adapters or sandbox HTTP clients
- [ ] No `server.js` / `app.js` wiring to runtime foundation
- [ ] No controller changes introducing provider execution
- [ ] No production feature flag defaults set to ON
- [ ] No credentials or secrets committed to the repository

---

## Approval

- [ ] Principal Payment Systems Architect sign-off
- [ ] Enterprise Review sign-off on Phase 2 commit
- [ ] Explicit written approval to begin Phase 3 work package(s)
- [ ] Phase 3 scope document agreed (see `TODO_PHASE3.md`)
- [ ] Rollback plan documented if Phase 3 introduces orchestration or flag changes

---

## Checklist Summary

| Area | Gate |
|------|------|
| Repository | Committed, tagged, clean |
| Validation | All tests + Enterprise Review |
| Architecture | Boundaries frozen per ADRs |
| Runtime | Sandbox-only, flags OFF |
| Production | No wiring, no behavior change |
| Approval | Explicit Phase 3 authorization |

**Do not begin Phase 3 implementation until every item in this checklist is satisfied.**
