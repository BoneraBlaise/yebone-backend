# Module 10 — Phase 2 Backlog

Runtime sandbox integration. **Architecture refined — see `ARCHITECTURE_PHASE2.md`.**

**Status:** Phase 2 complete (WP-1 through WP-5 validation). **Frozen — awaiting Enterprise Review and commit approval.**

**Phase 2 documentation freeze complete.**

Provider execution integration with Payment Engine is **Phase 3** — see `TODO_PHASE3.md` and entry gate `PHASE3_ENTRY_CRITERIA.md`.

---

## Phase 2A — Runtime Registration & Guard ✓ COMPLETE

- [x] `RuntimeAdapterRegistry` (parallel to Module 9 skeleton registry)
- [x] `RuntimeBootstrap` (wraps `RuntimeFactory`, no PaymentModule wiring)
- [x] `RuntimeAdapterResolver` — single authority; produces `ExecutionDecision`
- [x] `ExecutionDecision` model (immutable) — includes `fallbackAllowed`
- [x] `RuntimeExecutionGuard` — environment, flags, sandbox, credentials, live prevention
- [x] Rename `MTNMoMoTokenCache` → `ProviderTokenCache`
- [x] Shared `ProviderTokenCache` in `RuntimeFactory`
- [x] Runtime feature flags (additive, default OFF): `runtimeSandboxEnabled`, `mtnRuntimeEnabled`, `paypackRuntimeEnabled`
- [x] Unit tests (mock transport only)

**Exit:** Resolver produces correct `ExecutionDecision`; guards block non-sandbox; no production wiring.

---

## Phase 2B — MTN Runtime ✓ COMPLETE

- [x] Separate Collection credentials (`MTN_MOMO_COLLECTION_*`)
- [x] Separate Disbursement credentials (`MTN_MOMO_DISBURSEMENT_*`)
- [x] Disbursement status client
- [x] MTN Refund architecture (stub — no HTTP)
- [x] Injectable mock HTTP transport (non-production only)
- [x] Sandbox integration tests (credential-gated, optional CI job)

**Exit:** MTN collection + disbursement verified against sandbox API (mock + optional live).

---

## Phase 2C — Paypack Runtime ✓ COMPLETE

- [x] `PaypackCheckoutClient`
- [x] `PaypackCashinClient`
- [x] `PaypackVerifyClient`
- [x] Extend `PaypackRuntimeAdapter`
- [x] Refund support (architecture stub — dashboard-only)
- [x] Sandbox integration tests

**Exit:** Paypack checkout/cash-in/verify against sandbox (mock + optional live).

---

## Phase 2D — Security Hardening & Observability ✓ COMPLETE

### Security

- [x] Product-scoped credential keys in `EnvironmentCredentialProvider`
- [x] `SecretManagerProvider` / `VaultProvider` interfaces + no-op defaults
- [x] Credential rotation architecture (`CredentialRotationMetadata`, `CredentialRefreshService`)
- [x] Live execution env guard (`PAYMENT_RUNTIME_LIVE` blocked)
- [x] Error detail redaction (`AuthorizationRedactor`, `SecretRedactor`, `ProviderErrorMapper` sanitization)

### Observability (design + in-memory only)

- [x] `ExecutionTimeline` model (passive, read-only)
- [x] `ProviderRuntimeDiagnostics` with counters
- [x] Attach `ExecutionDecision` and `ExecutionTimeline` to diagnostics
- [x] No Prometheus / Datadog / exporters

**Exit:** Full diagnostic trace available in foundation test harness.

---

## Phase 2E — Validation & Freeze ✓ COMPLETE (validation only)

- [x] End-to-end foundation tests (mock transport — 206 tests pass)
- [x] Architecture verification (`npm run verify:architecture` — exit 0)
- [x] Confirm: Integration Gate unchanged; PaymentModule unwired
- [x] Documentation freeze (`README.md`, `TODO_PHASE2.md`, `KNOWN_LIMITATIONS.md`)
- [x] Phase 3 entry criteria documented (`PHASE3_ENTRY_CRITERIA.md`)
- [x] Architecture decisions documented (`ARCHITECTURE_DECISIONS.md`)
- [ ] Tag `payment-foundation-v3` (after Enterprise Review + commit approval)
- [ ] Sandbox runbook (deferred to Phase 3 prep if needed)

**Exit:** Phase 2 frozen. No new runtime code. Awaiting Enterprise Review.

---

## Phase 3 — Next (NOT STARTED)

See `TODO_PHASE3.md`:

- Payment Engine provider orchestration (optional)
- Runtime diagnostics wiring into execution path
- Production credential backends (secret manager / vault)
- Feature flag rollout strategy (explicit approval required)

---

## Explicitly Out of Scope (Phase 2 — honored)

- Provider execution inside Integration Gate pipeline
- PaymentEngine provider orchestration (Phase 3)
- PaymentModule / routes / server.js wiring
- Production endpoints
- Production feature flag defaults ON
