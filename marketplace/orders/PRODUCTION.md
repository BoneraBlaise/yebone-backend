# Orders Production Hardening v1.1

Baseline tag: `orders-v1`  
Production tag: `orders-production-v1`

This document describes production-critical safeguards added to the Orders module without changing public API routes or response shapes.

## Idempotency Flow

- Clients may send an optional `Idempotency-Key` header on `POST /api/v2/order/create-order`.
- Keys are persisted in MongoDB (`OrderIdempotencyRecord`) with a 24-hour TTL.
- Duplicate requests with the same key and payload return the original `{ orders, paymentSessions }` response.
- Reusing a key with a different payload returns `422`.
- Concurrent duplicate requests while processing return `409`.
- Without a key, order creation behaves as before (no replay protection).

## Transaction Flow

Order creation runs inside one MongoDB transaction via `OrderStateMachine.runInTransaction()`:

1. Atomic inventory reservation (`OrderInventoryService`)
2. Order document creation
3. Referral commission processing (`processOrderCommission` with session)

If any step fails, the transaction aborts and no partial writes remain.

Payment session creation uses the frozen payments facade and executes after the DB transaction commits. If payment session preparation fails, `OrderService.compensateFailedCreate()` deletes created orders and restores inventory.

## Inventory Concurrency Strategy

**Strategy:** conditional atomic update (`findOneAndUpdate` with `stock >= qty` guard + `$inc`).

- Reservation happens at order creation time (not on status update).
- Concurrent buyers race on the same product document; only one succeeds when stock is limited.
- Refund success restores stock atomically with `$inc`.

## Order State Machine

Canonical states: `pending → confirmed → packed → shipped → delivered`, with `cancelled → refunded`.

Legacy API statuses are mapped through `OrderStateMachine.LEGACY_TO_CANONICAL` / `CANONICAL_TO_LEGACY`.

Invalid transitions (examples):

- `Processing → Delivered` ❌
- `Processing refund → Delivered` ❌
- `Delivered → Processing` ❌

## Security Improvements

- `POST /create-order`: requires authentication + user ownership validation
- `GET /get-all-orders/:userId`: requires authentication + user ownership
- `GET /get-seller-all-orders/:shopId`: requires seller auth + shop ownership
- `PUT /order-refund/:id`: requires authentication + order ownership + status validation
- Status bodies are sanitized (`OrderSecurity.pickStatusBody`)
- Create payloads are whitelisted (`OrderValidation.sanitizeCreateInput`)

## Rate Limiting

Configurable in-memory rate limits:

| Endpoint group | Env var | Default |
|---|---|---|
| Create order | `ORDER_CREATE_RATE_LIMIT_MAX` | 10/min |
| Cancel/refund/status | `ORDER_MUTATION_RATE_LIMIT_MAX` | 20/min |
| Window | `ORDER_RATE_LIMIT_WINDOW_MS` | 60000 |

## Known Limitations

- Payment session creation does not participate in the MongoDB transaction (frozen `payments/` facade).
- Compensation runs after payment failure; transient payment outages may briefly leave retriable state before compensation.
- Rate limiting is process-local (not distributed across instances).
- Idempotency records expire after 24 hours; clients must not reuse keys beyond TTL for replay protection.

## Tests

```bash
npm run test:orders-production
npm run verify:orders-production
```

Integration tests require `MONGODB_TEST_URI` or `DB_URL`.
