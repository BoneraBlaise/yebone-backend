# Phase 4 Sprint 3 — Legacy Migration Runbook

## Dual transaction store limitation

Legacy `TransactionRepository` and Module 2 `TransactionService` may not share records until charge-path migration (Phase 4+). Sprint 3 webhook reconciliation resolves transactions via `TransactionService.getByProviderReference()` only.

## Migration phases

| Phase | Env flags | Behaviour |
|---|---|---|
| 0 | (none) | Legacy `PaymentService` only |
| 1 | `PAYMENT_COMPOSE_FOUNDATION` + `PAYMENT_ENABLE_WEBHOOKS` | Verify-only webhooks |
| 2 | + `PAYMENT_WEBHOOK_RECONCILIATION` | State reconciliation |
| 3 | + `PAYMENT_WEBHOOK_SETTLEMENT` | Ledger settlement bridge |
| 4+ | Per-provider charge flags | Foundation charge routing |

## Rollback

Disable the highest enabled flag — no deploy required for phases 1–3.

## Correlation policy

A single `correlationId` is established at the HTTP boundary and propagated through idempotency, settlement, events, audit, and responses. No component generates a replacement correlationId.
