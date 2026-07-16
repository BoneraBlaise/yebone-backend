# Module 10 — Phase 3 Backlog (Deferred)

Items explicitly **not** in Phase 2 scope. Requires separate architectural review before implementation.

---

## Provider Execution — Payment Engine Integration (Optional)

**Decision:** Provider execution must **NOT** be placed inside the Module 8 Integration Gate settlement pipeline.

The Integration Gate remains:

```
ENGINE → IDEMPOTENCY → TRANSACTION → COMMISSION → LEDGER → WALLET → AUDIT → EVENTS → COMPLETE
```

### Phase 3 proposal (requires review)

Introduce `ProviderExecutionOrchestrator` as an **external** concern callable from `PaymentEngine` — **not** from `PaymentIntegrationGate`:

```
PaymentEngine.charge()
  → idempotency
  → transaction + audit
  → ProviderAdapterResolver (descriptor)
  → RuntimeAdapterResolver → ExecutionDecision
  → ProviderCapabilityValidator
  → adapter.charge()  [MOCK | RUNTIME_SANDBOX]
  → return result with providerResponse attached
```

### Explicitly rejected (do not implement)

- ~~`ProviderExecutionStage` inside Integration Gate pipeline~~
- ~~Provider HTTP calls between TRANSACTION and COMMISSION~~
- ~~Provider execution before ledger posting within settlement gate~~

### Phase 3 prerequisites

- Phase 2E complete (sandbox verified)
- ExecutionDecision + RuntimeExecutionGuard proven in foundation tests
- Separate architecture review for engine ↔ provider coupling
- Still no PaymentModule, routes, or server.js wiring until explicit approval

---

## Production Environment

- Production URL registration in `ProviderEnvironmentResolver`
- Production credential backends (Secret Manager / Vault live)
- Controlled rollout per provider
- Production webhook inbound routes

---

## Integration Gate Extensions

Any future coupling between provider results and settlement (e.g. post-ledger reconciliation) requires a **new module or Phase 4 review** — not an inline pipeline stage.
