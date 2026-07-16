# Module 10 Phase 2 — Known Limitations

These limitations are **intentional** for the Phase 2 freeze. Phase 3 addresses orchestration and production readiness.

---

## Current Scope (Phase 2 Complete)

- Runtime architecture — sandbox only
- Mock transport default (live HTTP blocked unless injected in tests)
- MTN MoMo collection + disbursement runtime (sandbox)
- Paypack checkout + cash-in/out + verify runtime (sandbox)
- Security hardening (redaction, credential isolation, guard hardening)
- Passive observability (in-memory diagnostics — no exporters)
- **Not wired** to PaymentModule, PaymentEngine, routes, or server

---

## Implemented (Phase 2)

- `ExecutionDecision` with `fallbackAllowed` (declarative only — no fallback logic)
- `ExecutionTimeline` with `executionId` (passive diagnostics)
- `ProviderRuntimeDiagnostics` + `ProviderRuntimeMetrics` (in-memory counters)
- `RuntimeAdapterResolver` as single execution-mode authority
- `RuntimeAdapterRegistry` parallel to Module 9 skeleton registry
- Product-scoped credentials (MTN collection/disbursement, Paypack default/checkout)
- `SecretManagerProvider` / `VaultProvider` contracts (no-op defaults)
- `CredentialRefreshService` (client-initiated refresh only)
- Integration Gate remains settlement-only; provider execution outside Module 8

See `ARCHITECTURE_PHASE2.md` and `README.md`.

---

## Not Implemented (Phase 3+)

- Production execution
- PaymentModule wiring
- PaymentEngine provider orchestration
- Provider execution inside Integration Gate (explicitly rejected)
- Runtime diagnostics wired into adapter execution path (architecture ready; wiring deferred)
- Automatic credential rotation on 401
- Production webhooks
- Secret Manager cloud backend (stub/no-op only)
- Vault cloud backend (stub/no-op only)
- Distributed transactions
- Durable event outbox
- Runtime fallback logic (`fallbackAllowed` is declarative only)
- Runtime metrics exporters (Prometheus, Datadog)
- Runtime tracing exporters
- Tag `payment-foundation-v3` (pending Enterprise Review + commit)

---

## Safety (unchanged)

- `liveExecutionEnabled` defaults to `false`
- `PAYMENT_RUNTIME_LIVE` blocked by `RuntimeExecutionGuard`
- Provider feature flags default **OFF**
- Runtime isolated from production (`PaymentModule`, routes, `server.js` unchanged)
- No production HTTP calls in default test suites
- No production endpoints configured
- Error details sanitized before return (no credential/Authorization leak)

---

## Phase 3 Prerequisites

Before any Phase 3 implementation begins, every item in **`PHASE3_ENTRY_CRITERIA.md`** must be satisfied, including:

- Phase 2 committed and `payment-foundation-v3` tag applied
- All Module 9 and Module 10 tests passing
- Enterprise Review approved
- Explicit written approval to begin Phase 3

Architectural rationale is documented in **`ARCHITECTURE_DECISIONS.md`**.

No Phase 3 work should start until the entry criteria checklist is complete.

---

## Phase 3 Begins After This Freeze

Phase 3 covers Payment Engine provider orchestration, optional production credential backends, and explicit feature-flag rollout — see `TODO_PHASE3.md`. **Do not begin Phase 3 without satisfying `PHASE3_ENTRY_CRITERIA.md` and Enterprise Review approval of the Phase 2 commit.**
