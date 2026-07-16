# Module 10 — Provider Runtime (Phase 2 Complete)

Sandbox-first provider integration infrastructure. **Not wired to PaymentModule.**

**Baseline:** `payment-foundation-v3` (Phase 2 frozen).  
**Status:** Phase 3 Sprint 1 complete — Provider Execution Integration Foundation implemented (awaiting approval).

### Canonical references

| Document | Purpose |
|----------|---------|
| [`PHASE3_ENTRY_CRITERIA.md`](./PHASE3_ENTRY_CRITERIA.md) | Gate before Phase 3 implementation |
| [`PHASE3_EXIT_CRITERIA.md`](./PHASE3_EXIT_CRITERIA.md) | Completion criteria per work package |
| [`ROLLBACK_CRITERIA.md`](./ROLLBACK_CRITERIA.md) | When to stop and revert to v3 |
| [`ARCHITECTURE_DECISIONS.md`](./ARCHITECTURE_DECISIONS.md) | ADR-lite architectural decisions |
| [`TODO_PHASE3.md`](./TODO_PHASE3.md) | Phase 3 work packages and scope |

---

## Phase 3 Sprint 1 — Provider Execution Integration Foundation ✓

| Component | Role |
|-----------|------|
| `ProviderExecutionOrchestrator` | Coordinates injected resolvers, guard, validator — `charge`, `verify`, `payout`, `refund` |
| `ExecutionResult` | Immutable public boundary — sole orchestrator return type |
| `RuntimeFactory.createProviderExecutionOrchestrator()` | Composition root factory method (ADR-008) |
| `PaymentEngine` (optional DI) | When orchestrator injected, attaches `providerExecution` snapshot; unchanged when not injected |

Still **not wired** to PaymentModule, routes, or server. Feature flags remain default OFF.

---

## Components

| Component | Role |
|-----------|------|
| `ProviderHttpClient` | Injectable HTTP transport; live network blocked by default |
| `ProviderRequestSigner` | Subscription keys, bearer tokens, idempotency/correlation headers |
| `ProviderAuthentication` | Credential loading + token cache orchestration |
| `ProviderCredentialStore` | Aggregates env / secret-manager / vault providers |
| `ProviderRetryPolicy` | Idempotent-safe retries (OAuth, status) |
| `ProviderTimeoutPolicy` | Per-operation timeout resolution |
| `ProviderErrorMapper` | Maps runtime errors → `ProviderError` (sanitized details) |
| `ProviderResponseNormalizer` | Normalizes payloads → `ProviderResponse` |
| `ProviderWebhookVerifier` | HMAC webhook verification architecture |
| `ProviderSandboxConfig` | Sandbox endpoint registry |
| `ProviderEnvironmentResolver` | Sandbox-only environment resolution |
| `RuntimeAdapterContractSurface` | Shared Module 9 contract delegation for runtime adapters |
| `ProviderTokenCache` | In-memory OAuth token cache (provider + scope isolation) |

---

## Phase 2A — Runtime Registration Layer (WP-1) ✓

| Component | Role |
|-----------|------|
| `RuntimeAdapterRegistry` | Parallel registry for runtime adapters (`register`, `get`, `health`, …) |
| `RuntimeBootstrap` | Foundation entry via `createRuntimeFoundation()` — isolated from PaymentModule |
| `RuntimeAdapterResolver` | **Single authority** for execution mode; produces immutable `ExecutionDecision` |
| `ExecutionDecision` | Decision record: `executionMode`, `reason`, `fallbackAllowed`, adapter, descriptor |
| `RuntimeExecutionGuard` | Sandbox safety asserts (environment, flags, sandbox, credentials, live prevention) |
| `RuntimeFeatureFlagRegistry` | Runtime-only flags (default OFF): `runtimeSandboxEnabled`, `mtnRuntimeEnabled`, `paypackRuntimeEnabled` |

Resolver selects `MOCK` (Module 9 skeleton) or `RUNTIME_SANDBOX` (Module 10 runtime) — **decision only, no HTTP execution**.

---

## Phase 2B — MTN Runtime Sandbox (WP-2) ✓

| Component | Role |
|-----------|------|
| `MTNMoMoCredentials` | Collection vs disbursement scope resolution |
| `MTNMoMoOAuthClient` | Separate OAuth endpoints per scope |
| `MTNMoMoCollectionClient` | Collection charge + status |
| `MTNMoMoDisbursementClient` | Disbursement payout + status |
| `MTNMoMoRefundClient` | Architecture stub (no HTTP) |
| `MTNMoMoRuntimeAdapter` | charge, verify, payout, refund routing |

Product-scoped env keys: `MTN_MOMO_COLLECTION_*`, `MTN_MOMO_DISBURSEMENT_*` (legacy `MTN_MOMO_*` fallback).

---

## Phase 2C — Paypack Runtime (WP-3) ✓

| Component | Role |
|-----------|------|
| `PaypackCredentials` | Default vs checkout product resolution |
| `PaypackAuthClient` | OAuth / token acquisition |
| `PaypackCheckoutClient` | Checkout flow |
| `PaypackCashinClient` | Cash-in / cash-out |
| `PaypackVerifyClient` | Transaction verification |
| `PaypackRefundClient` | Architecture stub (dashboard-only refunds) |
| `PaypackRuntimeAdapter` | charge, verify, payout, refund routing |

Product-scoped env keys: `PAYPACK_DEFAULT_*`, `PAYPACK_CHECKOUT_*` (legacy `PAYPACK_*` fallback).

---

## Phase 2D — Security Hardening & Observability (WP-4) ✓

### Security

| Component | Role |
|-----------|------|
| `AuthorizationRedactor` | Centralized Authorization/Bearer/API-key redaction |
| `SecretRedactor` | Redaction for headers, env, credentials, errors, diagnostics |
| `SecretManagerProvider` / `NoOpSecretManagerProvider` | Secret manager contract (architecture only) |
| `VaultProvider` / `NoOpVaultProvider` | Vault contract (architecture only) |
| `CredentialRotationMetadata` | Immutable `version`, `expiresAt`, `rotatedAt` |
| `CredentialRefreshService` | Client-initiated `refresh()` (no auto-rotation) |

`PAYMENT_RUNTIME_LIVE` blocked by `RuntimeExecutionGuard.assertLiveExecutionPrevented()`.

### Observability (passive, in-memory only)

| Component | Role |
|-----------|------|
| `ExecutionTimeline` | Immutable read-only execution trace with stages |
| `ProviderRuntimeDiagnostics` | Attaches `ExecutionDecision` + `ExecutionTimeline` |
| `ProviderRuntimeMetrics` | Design-only counters (no exporters) |
| `CorrelationContext` | Correlation propagation helper |

No Prometheus, Datadog, or telemetry exporters.

Full architecture: `ARCHITECTURE_PHASE2.md`

---

## Providers

- **MTN MoMo** — OAuth, API User/Key, Collection, Disbursement
- **Paypack** — Authentication, checkout, cash-in/out, verify

## MTN MoMo OAuth

Collection and Disbursement use **separate sandbox token endpoints** and **separate cache scopes**:

| Product | OAuth path | Cache scope |
|---------|------------|-------------|
| Collection | `/collection/token/` | `collection` |
| Disbursement | `/disbursement/token/` | `disbursement` |

---

## Dual-Adapter Model

| Layer | Component | Role |
|-------|-----------|------|
| Module 9 | `ProviderAdapterRegistry` | Skeleton/mock adapters — **unchanged** |
| Module 10 | `RuntimeAdapterRegistry` | Runtime sandbox adapters — parallel registry |
| Module 10 | `RuntimeAdapterResolver` | Execution mode selection → `ExecutionDecision` |

**Provider execution is NOT added to the Module 8 Integration Gate pipeline.** Settlement remains accounting-only. Optional Payment Engine integration is **Phase 3** — see `TODO_PHASE3.md`.

## Contracts (Module 9 — unchanged)

All runtime adapters reuse:

- `ProviderReferenceContract`
- `ProviderIdempotencyContract`
- `WebhookVerificationContract` (via `ProviderWebhookVerifier`)

## Security

Credentials loaded via `EnvironmentCredentialProvider` (env vars). Stubs exist for secret manager and vault backends. **No secrets in repository.** Error details sanitized before return.

## Testing

```bash
npm run test:providers:all          # Module 9 foundation + Module 10 runtime (206 tests)
npm run test:providers:runtime      # Module 10 runtime only (146 tests)
npm run test:providers:sandbox      # Optional credential-gated sandbox (skipped by default)
npm run verify:architecture         # Cross-module architecture verification
```

Mock HTTP transport only — no live network calls in default suites.

## Constraints

- Do NOT wire to `PaymentModule`, routes, `app.js`, or `server.js`
- Do NOT enable feature flags in production defaults
- Do NOT merge to main or deploy without Enterprise Review approval
