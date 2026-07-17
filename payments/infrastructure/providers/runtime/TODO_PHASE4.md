# Phase 4 — Production Rollout (Application Bootstrap)

**Baseline:** `payment-foundation-v6` (Release Candidate)  
**Branch:** `feature/payment-foundation`  
**Status:** Sprint 1 in progress — Application Bootstrap Integration

---

## Scope Principle

Phase 4 activates the Release Candidate in the **application layer** without redesigning the payment foundation. Runtime remains sandbox-only; feature flags remain default OFF unless explicitly rolled out via `FeatureFlagRolloutSupport`.

---

## Sprint 1 — Application Bootstrap Integration

| Item | Status |
|------|--------|
| `PaymentApplicationBootstrap` — optional foundation composition | ✓ |
| `DependencyInjectionBootstrap` — wires foundation when `composePaymentFoundation: true` | ✓ |
| `ProviderFoundationWebhookHandler` — WebhookRegistry bridge (MTN + Paypack) | ✓ |
| `ProductionReadinessCheck` — foundation wiring probe | ✓ |
| `Phase4ApplicationBootstrap.test.js` | ✓ |

**Not in Sprint 1:** server.js changes, route mounting, feature flag defaults ON, live execution.

---

## Deferred (Sprint 2+)

- HTTP webhook route activation (`enableWebhooks: true`)
- Server bootstrap wiring
- Legacy PaymentService dual-path migration
- Metrics exporters
- Production live execution (blocked by guard)

---

## Activation

```javascript
DependencyInjectionBootstrap.create({
  config: {
    composePaymentFoundation: true,       // default false
    applyFeatureFlagRollout: false,         // explicit env rollout only
  },
});
```

Feature flags remain OFF until `applyFeatureFlagRollout: true` and env vars are set.
