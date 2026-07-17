# Phase 4 — Production Rollout (Application Bootstrap)

**Baseline:** `payment-foundation-v9` (Sprint 3)  
**Branch:** `feature/payment-foundation`  
**Status:** Sprint 3 complete — Webhook Reconciliation + Migration Strategy

---

## Scope Principle

Phase 4 activates the Release Candidate in the **application layer** without redesigning the payment foundation. Runtime remains sandbox-only; feature flags remain default OFF unless explicitly rolled out via `FeatureFlagRolloutSupport`.

---

## Sprint 3 — Webhook Reconciliation + Migration Strategy ✓

| Item | Status |
|------|--------|
| `TransactionCorrelationPolicy` — single correlationId chain | ✓ |
| `WebhookReconciliationResult` — canonical result model | ✓ |
| `WebhookIdempotencyService` — scoped duplicate protection | ✓ |
| `WebhookReplayGuard` — replay window | ✓ |
| `WebhookReconciliationOrchestrator` — state reconciliation | ✓ |
| `WebhookSettlementBridge` — optional settlement (flag-gated) | ✓ |
| `WebhookEventPublisher` — domain events | ✓ |
| `LegacyPaymentRoutingPolicy` — migration hooks | ✓ |
| Sprint 3 test suite | ✓ |

**Not in Sprint 3:** server.js/app.js changes, live execution, legacy charge cutover.

---

## Sprint 2 — HTTP Webhook Routes + Bootstrap Env Resolution ✓

| Item | Status |
|------|--------|
| `RuntimeConfigResolver` — env-gated bootstrap options | ✓ |
| HTTP webhook routes (opt-in) | ✓ |
| `Phase4Sprint2WebhookIntegration.test.js` | ✓ |

---

## Sprint 1 — Application Bootstrap Integration ✓

| Item | Status |
|------|--------|
| `PaymentApplicationBootstrap` | ✓ |
| `Phase4ApplicationBootstrap.test.js` | ✓ |

---

## Deferred (Sprint 4+)

- App-level raw body capture for byte-exact provider HMAC
- Metrics exporters
- Production live execution (blocked by guard)
- Full legacy charge path cutover

---

## Activation

```javascript
registerPaymentRuntime(app, {
  config: {
    composePaymentFoundation: true,
    enableWebhooks: true,
    enableWebhookReconciliation: true,
    enableWebhookSettlement: false,
    enableLegacyRoutingPolicy: false,
    applyFeatureFlagRollout: false,
  },
});

// Environment
PAYMENT_COMPOSE_FOUNDATION=true
PAYMENT_ENABLE_WEBHOOKS=true
PAYMENT_WEBHOOK_RECONCILIATION=true
PAYMENT_WEBHOOK_SETTLEMENT=false
PAYMENT_LEGACY_ROUTING_POLICY=false
```

Feature flags remain OFF until explicitly enabled.
