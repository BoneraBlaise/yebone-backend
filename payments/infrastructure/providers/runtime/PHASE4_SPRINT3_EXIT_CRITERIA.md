# Phase 4 Sprint 3 Exit Criteria

## Acceptance

- [ ] All Sprint 3 flags default OFF
- [ ] `TransactionCorrelationPolicy` enforces single correlationId chain
- [ ] `WebhookReconciliationResult` returned on all webhook paths
- [ ] Webhook idempotency uses separate `webhook_reconciliation` scope
- [ ] Replay window rejects stale events without mutation
- [ ] Transaction state transitions via Module 2 state machine
- [ ] Settlement bridge optional via `PAYMENT_WEBHOOK_SETTLEMENT`
- [ ] Legacy routing policy defaults to legacy charge path
- [ ] Architecture invariants unchanged
- [ ] `test:payment-foundation` passes
- [ ] `verify:architecture` passes

## Tag

`payment-foundation-v9`
