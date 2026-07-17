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

## Implemented (Phase 3 Sprint 3 — Release Candidate)

- `PaymentFoundationBootstrap` — wires provider + runtime + engine + webhooks
- `PaymentModule` optional foundation injection (backward compatible)
- `PaymentEngine.verify()`, `payout()`, `refund()` with orchestrator delegation
- `PaymentModuleWebhookService` — MTN + Paypack webhook verification
- `FeatureFlagRolloutSupport` — explicit env rollout (defaults OFF)
- Sprint 3 end-to-end validation suite

---

## Implemented (Phase 3 Sprint 2)

- MTN MoMo real sandbox validation (OAuth, collection, disbursement, verify) — credential-gated
- Paypack real sandbox validation (auth, checkout, cash-in/out, verify) — credential-gated
- Runtime metrics wired into HTTP, OAuth, and orchestrator execution paths
- `RuntimeMetricsEmitter` + `RuntimeExecutionContext` for in-memory observability
- `SandboxValidation.test.js` — end-to-end mock-transport orchestrator suite
- `Sprint2SecurityValidation.test.js` — security hardening regression suite
- Paypack `PAYOUTS` capability reflected in Module 4 matrix (runtime cash-out alignment)
- Refund remains stub (MTN architecture stub; Paypack dashboard-only)

---

## Implemented (Phase 4 Sprint 2)

- `RuntimeConfigResolver` — env-gated bootstrap (`PAYMENT_COMPOSE_FOUNDATION`, `PAYMENT_ENABLE_WEBHOOKS`)
- HTTP webhook route `POST /api/v1/payments/webhooks/:providerCode` (opt-in)
- `WebhookRequestContext` — correlationId + payload material propagation
- Webhook verify + accept only — no transaction state updates
- Startup/readiness diagnostics for webhook mount state

---

## Implemented (Phase 4 Sprint 3)

- `TransactionCorrelationPolicy` — immutable correlation chain across logs, audit, idempotency, events, settlement
- `WebhookReconciliationResult` — canonical result model on all webhook paths
- `WebhookIdempotencyService` — Mongo-scoped duplicate protection (`webhook_reconciliation`)
- `WebhookReplayGuard` — replay window enforcement
- `WebhookReconciliationOrchestrator` — verified transaction state reconciliation
- `WebhookSettlementBridge` — optional settlement via pipeline stages (flag-gated)
- `WebhookEventPublisher` — domain events after reconciliation
- `LegacyPaymentRoutingPolicy` — migration strategy (defaults legacy)
- Env flags: `PAYMENT_WEBHOOK_RECONCILIATION`, `PAYMENT_WEBHOOK_SETTLEMENT`, `PAYMENT_LEGACY_ROUTING_POLICY` (all default OFF)

---

## Not Implemented (deferred — Sprint 4+)

- **App-level raw body middleware** — stable `JSON.stringify` / `rawPayload` when provided; byte-exact pre-parse HMAC deferred
- Production live execution
- Feature flag defaults ON
- Metrics exporters (Prometheus, Datadog)
- PaymentModule replacing legacy PaymentService as default charge path
- Full legacy → foundation transaction store linking

---

## Previously deferred (now partially addressed in Phase 4)

- ~~Route and server wiring of foundation components~~ — Sprint 2: env bootstrap + webhook routes (opt-in)
- ~~Automatic env flag loading at bootstrap~~ — Sprint 2: `RuntimeConfigResolver` (explicit env keys, defaults false)

---

## Not Implemented (post–Release Candidate — remaining)

- Production live execution rollout
- Metrics exporters
- Full legacy → foundation migration as default path

---

## Safety (unchanged)

- `liveExecutionEnabled` defaults to `false`
- `PAYMENT_RUNTIME_LIVE` blocked by `RuntimeExecutionGuard`
- Provider feature flags default **OFF**
- Runtime isolated from production (`server.js`, `app.js` unchanged; webhook routes opt-in)
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
