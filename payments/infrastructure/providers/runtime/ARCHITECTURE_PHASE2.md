# Module 10 — Phase 2 Architecture (Refined)

**Baseline:** `payment-foundation-v2`  
**Status:** Architecture refinement only — no runtime implementation  
**Constraint:** Provider execution remains **outside** Module 8 Integration Gate settlement pipeline

---

## Boundary Rule — Integration Gate vs Provider Execution

The Integration Gate (Module 8) is responsible **only** for settlement/accounting orchestration:

```
ENGINE
  → IDEMPOTENCY
  → TRANSACTION
  → COMMISSION
  → LEDGER
  → WALLET
  → AUDIT
  → EVENTS
  → COMPLETE
```

Provider execution (charge, verify, refund, payout, webhooks) is an **external payment concern**. It must **never** be inserted into this pipeline without a separate architectural review.

Phase 2 builds runtime registration, resolution, guards, and provider clients in isolation. Optional Payment Engine integration is deferred to **Phase 3** (see `TODO_PHASE3.md`).

---

## Dual-Adapter Model (unchanged from Phase 2 kickoff)

| Layer | Component | Role |
|-------|-----------|------|
| Module 9 | `ProviderAdapterRegistry` | Skeleton/mock adapters — **unchanged** |
| Module 10 | `RuntimeAdapterRegistry` (planned) | Runtime sandbox adapters — parallel registry |
| Module 10 | `RuntimeAdapterResolver` (planned) | **Single authority** for execution mode selection |
| Module 9 | `ProviderAdapterResolver` | Descriptor resolution only |

---

## ExecutionDecision

**Purpose:** Immutable decision record produced by `RuntimeAdapterResolver`. Single diagnostics object explaining why a runtime or skeleton adapter was selected.

**Authority:** `RuntimeAdapterResolver` is the **only** component that constructs `ExecutionDecision`. No other layer may infer execution mode independently.

### Schema

```javascript
ExecutionDecision = Object.freeze({
  executionMode,     // "MOCK" | "RUNTIME_SANDBOX"
  providerCode,      // e.g. "MTN_MOMO"
  adapter,           // selected adapter instance (skeleton or runtime)
  descriptor,        // ProviderRegistry descriptor
  reason,            // machine-readable selection reason (see below)
  fallbackAllowed,   // policy/diagnostics: whether fallback is permitted (see below)
});
```

`fallbackAllowed` is a **diagnostics and policy field only**. It declares whether the selected execution mode is allowed to fall back. Phase 2 does **not** implement fallback logic — the resolver sets this field at decision time for future orchestrators and observability.

### fallbackAllowed rules (design only)

| executionMode | fallbackAllowed | Meaning |
|---------------|-----------------|---------|
| `RUNTIME_SANDBOX` | `false` | Runtime path selected; policy does not permit silent fallback to mock |
| `MOCK` | `true` | Skeleton/mock path selected; mock execution is the intended policy path |

All `MOCK` reasons (`runtimeSandboxDisabled`, `providerRuntimeDisabled`, etc.) set `fallbackAllowed: true`.  
`runtimeEnabled` sets `fallbackAllowed: false`.

### executionMode values

| Value | Meaning |
|-------|---------|
| `MOCK` | Module 9 skeleton adapter selected |
| `RUNTIME_SANDBOX` | Module 10 runtime adapter selected (sandbox only) |

### reason values

| reason | executionMode | Condition |
|--------|---------------|-----------|
| `runtimeEnabled` | `RUNTIME_SANDBOX` | All runtime gates pass |
| `runtimeSandboxDisabled` | `MOCK` | Master runtime sandbox flag OFF |
| `providerRuntimeDisabled` | `MOCK` | Provider-specific runtime flag OFF |
| `runtimeNotRegistered` | `MOCK` | No runtime adapter in registry |
| `environmentNotSandbox` | `MOCK` | Environment resolver blocked |
| `providerFlagDisabled` | `MOCK` | Provider feature flag OFF |
| `registryDisabled` | `MOCK` | Registry entry disabled |
| `fallbackDefault` | `MOCK` | Default safe path |

### Examples

```javascript
// Runtime selected — no fallback permitted
{
  executionMode: "RUNTIME_SANDBOX",
  providerCode: "MTN_MOMO",
  adapter: MTNMoMoRuntimeAdapter,
  descriptor: { code: "MTN_MOMO", ... },
  reason: "runtimeEnabled",
  fallbackAllowed: false
}

// Skeleton selected — mock is the policy path
{
  executionMode: "MOCK",
  providerCode: "MTN_MOMO",
  adapter: MTNMoMoAdapter,
  descriptor: { code: "MTN_MOMO", ... },
  reason: "runtimeSandboxDisabled",
  fallbackAllowed: true
}
```

### Selection precedence (resolver logic — design only)

```
1. providerFlagDisabled        → MOCK
2. registryDisabled            → MOCK
3. runtimeSandboxDisabled      → MOCK
4. providerRuntimeDisabled     → MOCK
5. runtimeNotRegistered        → MOCK
6. environmentNotSandbox       → MOCK
7. all gates pass              → RUNTIME_SANDBOX
8. default                     → MOCK (fallbackDefault)
```

---

## RuntimeExecutionGuard

**Purpose:** Focused guard with single-responsibility methods. Called by resolver and orchestrator (Phase 3) — **not** implemented in Phase 2a.

| Method | Responsibility |
|--------|----------------|
| `assertEnvironment()` | Validates resolved environment is allowed (sandbox only at Phase 2) |
| `assertExecutionAllowed()` | Validates no production execution path is active |
| `assertRuntimeEnabled()` | Validates master + provider runtime feature flags |
| `assertSandbox()` | Validates sandbox URLs, sandbox credentials scope, no production endpoints |

Each method throws a typed guard error on violation. Methods are composable; callers invoke only what the stage requires.

**Not a god-object:** No HTTP, no adapter selection, no credential loading inside the guard.

---

## ExecutionTimeline

**Purpose:** Read-only passive diagnostics tracing a single provider runtime execution. Uniquely identifies every runtime execution for future tracing, replay analysis, and observability. No logging. No telemetry. No side effects.

### Immutable metadata

Every `ExecutionTimeline` carries these immutable identity fields (set at creation, copied from `ExecutionDecision` where applicable):

| Field | Purpose |
|-------|---------|
| `executionId` | Unique identifier for this provider execution (UUID) |
| `correlationId` | Propagated from request/engine trace |
| `providerCode` | Provider under execution |
| `executionMode` | `MOCK` or `RUNTIME_SANDBOX` (from `ExecutionDecision`) |

### Stages

| Stage | Description |
|-------|-------------|
| `START` | Execution initiated |
| `RESOLVE_PROVIDER` | Descriptor + ExecutionDecision resolved |
| `AUTHENTICATE` | OAuth / token acquisition |
| `REQUEST_SIGNING` | Headers and idempotency applied |
| `HTTP_REQUEST` | Outbound request dispatched |
| `HTTP_RESPONSE` | Response received |
| `NORMALIZE_RESPONSE` | ProviderResponse normalized |
| `COMPLETE` | Successful completion |
| `ERROR` | Terminal error (may occur after any stage) |

### Structure (design only)

```javascript
ExecutionTimeline = Object.freeze({
  executionId,       // UUID — unique per provider execution
  correlationId,     // from request trace
  providerCode,      // e.g. "MTN_MOMO"
  executionMode,     // "MOCK" | "RUNTIME_SANDBOX" (from ExecutionDecision)
  operation,         // e.g. "charge"
  decisionReason,    // from ExecutionDecision.reason
  fallbackAllowed,   // from ExecutionDecision.fallbackAllowed
  stages: [          // ordered, append-only
    { stage: "START", at: ISO8601, durationMs: null },
    { stage: "RESOLVE_PROVIDER", at: ISO8601, durationMs: 12 },
    ...
  ],
  totalDurationMs,
  outcome: "COMPLETE" | "ERROR",
});
```

Timeline is created when provider execution begins. `executionId` is generated at `START`. Metadata fields are immutable after creation. Timeline is attached to `ProviderRuntimeDiagnostics` — never written to audit or external systems in Phase 2.

---

## ProviderRuntimeDiagnostics

**Purpose:** In-memory diagnostic collector for a single request scope. Design only — no exporters.

### Counters (architectural — design only)

| Counter | Incremented when |
|---------|------------------|
| `oauth_cache_hit` | Token returned from cache |
| `oauth_cache_miss` | Token fetched from provider |
| `provider_retry` | Retry policy triggers retry |
| `provider_timeout` | Request exceeds timeout policy |
| `provider_success` | Provider operation succeeds |
| `provider_failure` | Provider operation fails |
| `provider_duration` | Total provider operation time (ms) |
| `runtime_mock` | ExecutionDecision.mode === MOCK |
| `runtime_http` | ExecutionDecision.mode === RUNTIME_SANDBOX |

### Attachments

- `executionDecision` — the `ExecutionDecision` for this request (includes `fallbackAllowed`)
- `executionTimeline` — the `ExecutionTimeline` for this request (includes `executionId`)
- `correlationId` — duplicated for lookup convenience (matches timeline metadata)

No Prometheus. No Datadog. No exporters in Phase 2.

---

## Dependency Graph (Phase 2 target)

```
FeatureFlagRegistry
ProviderRegistry (Module 4)
        │
        ├── ProviderAdapterRegistry (Module 9 — skeleton)
        │         └── skeleton adapters
        │
        ├── RuntimeAdapterRegistry (Phase 2A — planned)
        │         └── RuntimeFactory → runtime adapters
        │
        ├── ProviderAdapterResolver (descriptor only)
        │
        └── RuntimeAdapterResolver (Phase 2A — planned)
                  ├── RuntimeExecutionGuard
                  ├── produces ExecutionDecision
                  └── selects adapter (MOCK | RUNTIME_SANDBOX)

ProviderCapabilityValidator (Module 9 — reuse, no duplication)

ProviderRuntimeDiagnostics (Phase 2D — planned)
        ├── ExecutionTimeline
        └── counters (design only)

PaymentIntegrationGate (Module 8)
        └── settlement pipeline ONLY — no provider stage

PaymentEngine (Module 4)
        └── Phase 3 only: optional external provider orchestration
```

---

## Execution Flow (Phase 2 — runtime layer only)

Provider execution flow when invoked (foundation test harness or Phase 3 orchestrator):

```
Request + trace
    │
    ▼
ProviderAdapterResolver.resolve()
    │  (descriptor)
    ▼
RuntimeAdapterResolver.resolve()
    │  RuntimeExecutionGuard.assert*()
    │  produces ExecutionDecision (incl. fallbackAllowed)
    ▼
ExecutionTimeline created (executionId generated)
    │  metadata: correlationId, providerCode, executionMode
    ▼
ExecutionTimeline.START
    │
    ▼
ProviderCapabilityValidator.validate()
    │
    ▼
[ RUNTIME_SANDBOX ]                    [ MOCK ]
    │                                      │
    ▼                                      ▼
RuntimeExecutionGuard.assertSandbox()   skeleton adapter
    │                                      │
    ▼                                      ▼
runtime adapter.charge()              mock charge()
    │                                      │
    ▼                                      ▼
ExecutionTimeline.COMPLETE            ExecutionTimeline.COMPLETE
    │                                      │
    └──────────────┬───────────────────────┘
                   ▼
        ProviderRuntimeDiagnostics
        (decision + timeline with executionId + counters)
```

Settlement flow (Integration Gate) runs **independently** and never calls the above path in Phase 2.

---

## Phase Roadmap

| Phase | Scope |
|-------|-------|
| **2A** | Runtime Registry, Runtime Resolver, Runtime Guard, ProviderTokenCache |
| **2B** | MTN Runtime (sandbox clients, credentials, live sandbox validation) |
| **2C** | Paypack Runtime (checkout, cash-in, verify) |
| **2D** | Security Hardening, Observability (ExecutionDecision, Timeline, Diagnostics) |
| **2E** | Validation, Sandbox Verification, documentation freeze |
| **3** | Optional ProviderExecution integration with Payment Engine — **never inside Integration Gate** |

See `TODO_PHASE2.md` for work items and `TODO_PHASE3.md` for deferred integration.

---

## Feature Flags (additive, default OFF)

| Flag | Scope |
|------|-------|
| `runtimeSandboxEnabled` | Master runtime sandbox switch |
| `mtnRuntimeEnabled` | MTN runtime adapter |
| `paypackRuntimeEnabled` | Paypack runtime adapter |

Existing provider flags (`mtnEnabled`, etc.) remain the capability gate. Runtime flags are a second gate for sandbox HTTP only.
