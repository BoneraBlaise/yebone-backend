# Phase 4 Sprint 2 — Exit Criteria

**Baseline:** `payment-foundation-v7`  
**Target tag:** `payment-foundation-v8`  
**Scope:** HTTP webhook routes + server bootstrap env resolution

---

## Exit Criteria

### Bootstrap

- [x] `RuntimeConfigResolver` maps env vars with defaults **false**
- [x] `registerPaymentRuntime(app)` unchanged behavior when env unset
- [x] `PAYMENT_COMPOSE_FOUNDATION`, `PAYMENT_ENABLE_WEBHOOKS`, `PAYMENT_APPLY_FEATURE_FLAG_ROLLOUT` supported

### Webhook HTTP

- [x] `POST /api/v1/payments/webhooks/:providerCode` mounted when foundation + enableWebhooks
- [x] MTN_MOMO and PAYPACK handlers reachable
- [x] Verify + accept only — no transaction state updates
- [x] correlationId propagated through lifecycle and HTTP response

### Architecture invariants

- [x] RuntimeFactory unchanged
- [x] RuntimeAdapterResolver unchanged
- [x] Integration Gate unchanged
- [x] PaymentFoundationBootstrap unchanged
- [x] Module 9 contracts unchanged
- [x] server.js and app.js unchanged

### Deferred to Sprint 3

- Duplicate webhook protection / idempotency
- App-level raw body capture for byte-exact provider HMAC
- Transaction state updates from webhooks
- Legacy PaymentService dual-path migration
