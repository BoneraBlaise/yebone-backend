# Phase 4 — Production Rollout (Application Bootstrap)

**Baseline:** `payment-foundation-v8` (Sprint 2)  
**Branch:** `feature/payment-foundation`  
**Status:** Sprint 2 complete — HTTP Webhook Routes + Bootstrap Env Resolution

---

## Scope Principle

Phase 4 activates the Release Candidate in the **application layer** without redesigning the payment foundation. Runtime remains sandbox-only; feature flags remain default OFF unless explicitly rolled out via `FeatureFlagRolloutSupport`.

---

## Sprint 2 — HTTP Webhook Routes + Bootstrap Env Resolution ✓

| Item | Status |
|------|------|
| `RuntimeConfigResolver` — env-gated bootstrap options | ✓ |
| `registerPaymentRuntime` env merge (defaults unchanged) | ✓ |
| `WebhookRouter` — correlation, guard errors, sanitized responses | ✓ |
| `WebhookRequestContext` — correlation + payload material | ✓ |
| Webhook route mount guard (foundation + handlers required) | ✓ |
| Startup/readiness webhook diagnostics | ✓ |
| `Phase4Sprint2WebhookIntegration.test.js` | ✓ |

**Not in Sprint 2:** server.js/app.js changes, transaction updates, duplicate webhook protection, live execution.

---

## Sprint 1 — Application Bootstrap Integration ✓

| Item | Status |
|------|------|
| `PaymentApplicationBootstrap` — optional foundation composition | ✓ |
| `DependencyInjectionBootstrap` — wires foundation when `composePaymentFoundation: true` | ✓ |
| `ProviderFoundationWebhookHandler` — WebhookRegistry bridge (MTN + Paypack) | ✓ |
| `ProductionReadinessCheck` — foundation wiring probe | ✓ |
| `Phase4ApplicationBootstrap.test.js` | ✓ |

---

## Deferred (Sprint 3+)

- Duplicate webhook idempotency / replay protection
- App-level raw body capture for byte-exact provider HMAC
- Legacy PaymentService dual-path migration
- Transaction state updates from webhooks
- Metrics exporters
- Production live execution (blocked by guard)

---

## Activation

```javascript
// Programmatic
registerPaymentRuntime(app, {
  config: {
    composePaymentFoundation: true,
    enableWebhooks: true,
    applyFeatureFlagRollout: false,
  },
});

// Environment (opt-in inside payments/runtime)
PAYMENT_COMPOSE_FOUNDATION=true
PAYMENT_ENABLE_WEBHOOKS=true
PAYMENT_APPLY_FEATURE_FLAG_ROLLOUT=false
```

Feature flags remain OFF until rollout env vars are explicitly applied.
