# Transactional Consistency — Integration Gate (Module 8)

## Idempotency retry safety

Settlement side effects are keyed to the idempotency key:

- **Transaction id:** `SettlementIdentity.deriveTransactionId(idempotencyKey)` — stable across retries
- **Ledger journals:** `fund-{transactionId}` and `release-{transactionId}` — duplicate posts are skipped on retry

`SettlementRetryGuard` resolves existing transaction and ledger journals before creating or posting. A failed handler retry for the same idempotency key **must not** create a second transaction or duplicate journals when both fund and release journals are present.

**Partial ledger state** (only fund or only release posted) throws `SettlementPartialStateError` and blocks retry until a future compensation module resolves the inconsistency.

## Transaction lifecycle consistency

Settlement is **not complete** for wallet projection, audit, or events until `TransactionService` reaches **`SETTLED`**.

| Stage | Transaction state required |
|-------|---------------------------|
| Before ledger posting | `CAPTURED` (`CREATED → AUTHORIZED → CAPTURED`) |
| After ledger posting | `SETTLED` (`CAPTURED → SETTLED`) |
| Audit / Events | `SETTLED` (enforced by `SettlementLifecycleCoordinator.assertReadyForAudit`) |

Audit `after.status` and event payload `status` use `PaymentTransactionStatus.SETTLED` from the transaction record — not documentary strings.

## Partial failure after LEDGER

| Failure at | Transaction | Ledger | Audit / Events |
|------------|-------------|--------|----------------|
| WALLET (after LEDGER stage) | `SETTLED` | Committed | Not emitted |
| AUDIT | `SETTLED` | Committed | Not emitted |
| EVENTS | `SETTLED` | Committed | Partial (in-process) |

## Wallet rebuildability

Balances are ledger projections only. Wallet registry stores identity metadata — rebuildable after restart.

## PaymentEngine boundary

Engine is readiness-only. `PaymentEngine.charge()` is not invoked by the integration gate.

## Replay-safe audit and event publication (future)

Audit and event retries can duplicate append/publish today. See `REPLAY_SAFE_PUBLICATION.md` and `ReplaySafePublicationContract` for deterministic identity rules (`SettlementPublicationIdentity`) and Module 9+ deduplication plan. **Not active in Module 8 runtime.**
