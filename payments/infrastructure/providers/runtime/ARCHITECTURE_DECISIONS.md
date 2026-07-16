# Module 10 — Architecture Decisions

**Format:** ADR-lite (Architecture Decision Record — lightweight)

**Scope:** Module 10 Provider Runtime (Phase 2 + Phase 3)

**Status:** ADR-001 through ADR-007 accepted at Phase 2 freeze; ADR-008 accepted at Phase 3 Sprint 1; ADR-009 through ADR-011 accepted at Sprint 1 Architecture Stress Test documentation refinement

These decisions explain *why* Module 10 is structured as it is. They are canonical references before Phase 3 begins. See also `PHASE3_ENTRY_CRITERIA.md`.

---

## ADR-001 — Separate RuntimeAdapterRegistry from ProviderAdapterRegistry

**Context:** Module 9 introduced skeleton/mock provider adapters for descriptor resolution, health checks, and mock execution. Phase 2 requires real sandbox HTTP adapters without breaking Module 9 behavior or merging incompatible lifecycles.

**Decision:** Maintain two parallel registries:

| Registry | Module | Adapters | Default |
|----------|--------|----------|---------|
| `ProviderAdapterRegistry` | 9 | Skeleton/mock | OFF until enabled |
| `RuntimeAdapterRegistry` | 10 | Sandbox HTTP runtime | OFF until enabled |

`RuntimeAdapterResolver` selects between them via `ExecutionDecision` — it does not merge registries.

**Consequences:**

- Module 9 skeleton adapters remain unchanged and testable in isolation
- Module 10 runtime adapters can evolve (OAuth, HTTP, credentials) without destabilizing mock paths
- Two adapter classes per provider (skeleton + runtime) is intentional, not duplication
- Registration and health checks are independent per registry
- Phase 3 orchestration can consume `ExecutionDecision` without rewriting Module 9

---

## ADR-002 — RuntimeFactory as the Only Composition Root

**Context:** Provider runtime involves many collaborators (credential store, HTTP client, OAuth clients, error mappers, token cache). Ad-hoc instantiation scatters dependencies and makes sandbox safety guarantees hard to enforce.

**Decision:** `RuntimeFactory` is the **only** composition root for provider runtime object graphs:

- `createCredentialStore()`, `createHttpClient()`, `createMtnMoMoRuntime()`, `createPaypackRuntime()`, `create()`
- All MTN and Paypack HTTP clients are wired exclusively through the factory
- `RuntimeBootstrap` delegates adapter graph construction to `RuntimeFactory.create()` and only adds registration/resolution wiring

**Consequences:**

- Dependency injection is centralized; sandbox defaults (`liveExecutionEnabled: false`, blocked transport) apply consistently
- Tests inject mock transport via factory options — no live network by default
- Adapter constructor fallbacks (`|| new …`) exist for test convenience but production paths must use the factory
- Phase 3 wiring (PaymentEngine, diagnostics) has a single injection point

---

## ADR-003 — Module 10 Reuses Module 9 Contracts (No Duplication)

**Context:** Reference generation, idempotency key construction, and webhook verification algorithms must be identical between mock and runtime paths to avoid settlement/reference drift.

**Decision:** Module 9 owns all contract implementations:

- `ProviderReferenceContract`
- `ProviderIdempotencyContract`
- `WebhookVerificationContract` (via `ProviderWebhookVerifier`)

Module 10 **consumes** these contracts through `RuntimeAdapterContractSurface` and client-level delegation. No contract logic is reimplemented in runtime adapters or clients.

**Consequences:**

- Single source of truth for reference/idempotency algorithms
- `RuntimeAdapterContractParity.test.js` enforces structural parity with skeleton adapters
- Contract changes in Module 9 automatically apply to runtime adapters
- Runtime files import upward to Module 9 — never the reverse

---

## ADR-004 — Provider Execution Is NOT Part of Module 8 Integration Gate

**Context:** Module 8 Integration Gate orchestrates settlement: engine validation, idempotency, transaction, commission, ledger, wallet, audit, events. Provider charge/verify/refund/payout involves external HTTP, credentials, and provider-specific failure modes.

**Decision:** Provider execution remains **outside** the Integration Gate settlement pipeline.

Settlement pipeline (unchanged):

```
ENGINE → IDEMPOTENCY → TRANSACTION → COMMISSION → LEDGER → WALLET → AUDIT → EVENTS → COMPLETE
```

There is no `ProviderExecutionStage`. `PaymentIntegrationGate` performs coordination only — no provider API calls, webhooks, or external HTTP.

**Consequences:**

- Settlement accounting remains deterministic and provider-agnostic
- Provider failures do not corrupt ledger/wallet posting order
- Runtime sandbox work proceeds in Module 10 without Module 8 changes
- Phase 3 PaymentEngine orchestration is a **separate** integration point — not an insertion into settlement stages

**Future review required:** Before any PaymentEngine integration, re-validate ADR-004 with Enterprise Review. Adding provider execution to Module 8 requires explicit architectural review and ADR amendment.

---

## ADR-005 — Runtime Defaults to Sandbox-Only

**Context:** Provider APIs (MTN MoMo, Paypack) have sandbox and production environments. Premature live execution risks real-money operations during foundation development.

**Decision:**

- `RuntimeConfig.defaultEnvironment = "sandbox"`
- `RuntimeConfig.liveExecutionEnabled = false`
- `ProviderEnvironmentResolver` resolves sandbox endpoints only
- `RuntimeExecutionGuard.assertEnvironment("sandbox")` blocks non-sandbox
- `ProviderHttpClient` blocks live HTTP unless transport is explicitly injected
- `PAYMENT_RUNTIME_LIVE` env var blocked by guard

**Consequences:**

- Default test suites use mock transport — no live network
- Optional sandbox integration tests are credential-gated and skipped by default
- Production execution requires explicit Phase 3+ approval and configuration changes
- Guard assertions provide defense-in-depth beyond config defaults

---

## ADR-006 — Feature Flags Default OFF

**Context:** Runtime sandbox, MTN runtime, and Paypack runtime are additive capabilities. Enabling them by default would change system behavior for all deployments immediately upon merge.

**Decision:** All runtime feature flags default **OFF**:

- `runtimeSandboxEnabled`
- `mtnRuntimeEnabled`
- `paypackRuntimeEnabled`

Flags are registered in `RuntimeFeatureFlagRegistry` and checked by `RuntimeExecutionGuard.assertRuntimeEnabled()`. Enabling requires explicit opt-in — never default ON in production configuration.

**Consequences:**

- Phase 2 merge does not activate provider HTTP execution in any environment
- `RuntimeAdapterResolver` returns `MOCK` / `fallbackAllowed: true` when flags are off
- Rollout can be staged per provider in Phase 3+ with explicit approval
- Feature flag changes are visible, auditable configuration events

---

## ADR-007 — Runtime Adapters and Skeleton Adapters Permanently Coexist

**Context:** Mock/skeleton adapters support development, testing, and descriptor resolution without credentials or network access. Runtime adapters support sandbox HTTP verification. Both are valid execution paths.

**Decision:** Skeleton adapters (Module 9) and runtime adapters (Module 10) **permanently coexist**. Neither replaces the other.

- `ExecutionDecision.executionMode`: `MOCK` → skeleton adapter; `RUNTIME_SANDBOX` → runtime adapter
- `fallbackAllowed: true` for MOCK; `false` for RUNTIME_SANDBOX
- Fallback logic itself is declarative in Phase 2 — orchestration deferred to Phase 3

**Consequences:**

- Tests and local development can run without provider credentials
- Sandbox verification uses runtime adapters when flags and guards pass
- No migration path that deletes skeleton adapters — they remain the safe default
- Phase 3 PaymentEngine can implement fallback policy using `ExecutionDecision.fallbackAllowed`

---

## ADR-008 — Constructor Injection Only (Phase 3 WP-1)

**Context:** `ProviderExecutionOrchestrator` coordinates multiple collaborators (resolvers, guard, capability validator). Allowing the orchestrator to instantiate runtime components, call `RuntimeFactory` internally, or resolve dependencies at runtime would create a second composition root and violate sandbox safety guarantees.

**Decision:**

- `RuntimeFactory` remains the **only** composition root — it creates every dependency in the object graph
- `RuntimeBootstrap` composes `RuntimeFactory` and wires registration/resolution; it may expose a factory method that returns a fully injected orchestrator
- `ProviderExecutionOrchestrator` receives **constructor injection only**:

```javascript
ProviderExecutionOrchestrator({
  providerAdapterResolver,
  runtimeAdapterResolver,
  runtimeExecutionGuard,
  providerCapabilityValidator,
})
```

**Prohibited inside `ProviderExecutionOrchestrator`:**

- Calling `RuntimeFactory` or `RuntimeFactory.create()`
- Instantiating resolvers, guards, validators, or adapters
- Service Locator pattern (registry lookup, `require()` for deps, singleton access)
- Hidden or lazy dependency resolution

The orchestrator **coordinates** injected collaborators. Adapters are obtained from resolver results (`ExecutionDecision.adapter`, `ProviderAdapterResolver.resolve().adapter`) — never constructed by the orchestrator.

**Consequences:**

- Single composition authority preserved (ADR-002 extended)
- Unit tests inject mocks via constructor — no factory mocking inside orchestrator tests
- `ProviderExecutionOrchestrator` never depends directly on `RuntimeFactory`
- Rollback trigger if Service Locator or internal instantiation detected (`ROLLBACK_CRITERIA.md`)

**Note (ADR-009):** Lightweight observability helpers (`CorrelationContext`, `ProviderRuntimeDiagnosticsCollector`) are temporarily self-instantiated per request — see ADR-009. This does not amend ADR-008’s prohibition on instantiating resolvers, guards, validators, or adapters.

---

## ADR-009 — Temporary Self-Instantiation of Lightweight Observability Helpers

**Context:** Sprint 1 attaches `ExecutionTimeline` and `ProviderRuntimeDiagnostics` on every orchestrator execution path. `CorrelationContext` and `ProviderRuntimeDiagnosticsCollector` are stateless, per-request infrastructure helpers — not business-logic collaborators.

**Decision:** Self-instantiation of lightweight observability helpers is **temporarily accepted** during Sprint 1 because these helpers are stateless infrastructure components. This does **NOT** create business logic ownership inside `ProviderExecutionOrchestrator`.

Future phases may replace them with injected factories (`CorrelationContextFactory`, `ProviderRuntimeDiagnosticsFactory`) without changing orchestrator execution behavior.

**Consequences:**

- No runtime behavior changes required for Sprint 1 approval
- No dependency inversion violations for core collaborators (resolvers, guard, validator remain injected)
- Easy migration to injected factories in a future work package
- No architectural blocker for Sprint 1 Enterprise Review

---

## ADR-010 — ProviderResponse.fromResult() Is a Boundary Envelope, Not Normalization

**Context:** `ProviderExecutionOrchestrator` calls `ProviderResponse.fromResult()` after an adapter returns. Stress testing raised whether this constitutes provider response normalization inside the orchestrator.

**Decision:** `ProviderResponse.fromResult()` is a **boundary envelope** — it freezes and validates the shape of an already-produced response for inclusion in `ExecutionResult`. It is **NOT** provider response normalization.

Provider-specific normalization remains **entirely inside runtime adapters** (via `ProviderResponseNormalizer`, adapter `_execute` handlers, and Module 9 skeleton mock paths). The orchestrator only converts adapter output into the public `ExecutionResult` boundary.

**Consequences:**

- Normalization authority stays with adapters — no provider-specific mapping in the orchestrator
- `ExecutionResult.providerResponse` is always a frozen `ProviderResponse` envelope
- Future adapter changes do not require orchestrator changes
- Separation is intentional and preserves ADR-008 coordination-only role

---

## ADR-011 — Runtime Provider Onboarding via PROVIDER_RUNTIME_FLAG_MAP

**Context:** Adding a new sandbox runtime provider (e.g. Flutterwave, Stripe, PayPal) must not require changes to core orchestration types. `RuntimeFeatureFlagRegistry.PROVIDER_RUNTIME_FLAG_MAP` maps provider codes to per-provider runtime flags consumed by `RuntimeAdapterResolver` and `RuntimeExecutionGuard`.

**Decision:** `RuntimeFeatureFlagRegistry.PROVIDER_RUNTIME_FLAG_MAP` is the **canonical registration point** for onboarding a new runtime provider’s feature flag. Combined with adapter registration, it completes runtime enablement without modifying orchestration boundaries.

### Standard provider onboarding checklist

| Step | Location | Required |
|------|----------|----------|
| Module 9 skeleton adapter | `payments/infrastructure/providers/adapters/` + `ProviderAdapterRegistry` | Yes (greenfield providers) |
| Module 10 runtime adapter | `payments/infrastructure/providers/runtime/{provider}/` | Yes |
| `RuntimeFactory` registration | `RuntimeFactory.create*Runtime()` | Yes |
| `RuntimeBootstrap` registration | `registerDefaultRuntimeAdapters()` | Yes |
| `RuntimeFeatureFlagRegistry.PROVIDER_RUNTIME_FLAG_MAP` | Flag name for provider code | Yes |
| `ProviderSandboxConfig` | Sandbox base URL + metadata | Yes |
| Credentials | Provider-scoped credential provider / env keys | Yes |
| Tests | Mock transport unit tests + registry/resolver coverage | Yes |

### Must NOT change when onboarding a new provider

- `PaymentEngine`
- `PaymentIntegrationGate` (Integration Gate)
- `ProviderExecutionOrchestrator`
- `ExecutionResult`

Only adapter implementation and Module 9/10 registration wiring are required. Existing providers (Flutterwave, Stripe) may skip skeleton work if Module 9 adapters are already registered.

**Consequences:**

- Orchestration types remain provider-agnostic
- Rollout remains flag-gated per provider (ADR-006)
- Onboarding checklist is explicit — reduces missed registration steps
- PayPal or other greenfield providers require Module 9 skeleton work in addition to runtime registration

---

## Decision Index

| ADR | Title | Status |
|-----|-------|--------|
| ADR-001 | Separate runtime registry from skeleton registry | Accepted |
| ADR-002 | RuntimeFactory as only composition root | Accepted |
| ADR-003 | Reuse Module 9 contracts | Accepted |
| ADR-004 | No provider execution in Integration Gate | Accepted |
| ADR-005 | Sandbox-only runtime defaults | Accepted |
| ADR-006 | Feature flags default OFF | Accepted |
| ADR-007 | Skeleton and runtime adapters coexist | Accepted |
| ADR-008 | Constructor injection only (orchestrator) | Accepted |
| ADR-009 | Temporary self-instantiation of observability helpers | Accepted |
| ADR-010 | ProviderResponse.fromResult() is boundary envelope | Accepted |
| ADR-011 | Runtime provider onboarding via flag map | Accepted |

**Amendments:** Any decision marked Accepted may only be amended through Enterprise Review and an explicit ADR update before Phase 3 implementation that contradicts it.
