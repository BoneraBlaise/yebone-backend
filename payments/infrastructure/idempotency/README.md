# Module 1 — MongoDB Idempotency Layer

Production-ready idempotency for the Yebone payment foundation. Persists idempotency records in MongoDB with TTL expiration, unique indexes, and the same `execute()` contract as the in-memory `IdempotencyService`.

## Architecture

```
HTTP Request
    ↓
IdempotencyMiddleware (extract headers → req.idempotencyContext)
    ↓
MongoIdempotencyService.execute(key, payload, handler, context)
    ↓
IdempotencyRepository.claimProcessing()  →  payment_idempotency_keys
    ↓
handler() on first claim; replay cached result on duplicate
```

## Database collection

**Collection:** `payment_idempotency_keys`

| Field | Type | Description |
|-------|------|-------------|
| `idempotencyKey` | String | Client-supplied idempotency key (max 256 chars) |
| `scope` | String | Optional namespace (e.g. `checkout`, `payout`) |
| `paymentReference` | String | External or internal payment reference |
| `correlationId` | String | Distributed tracing correlation ID |
| `requestId` | String | Unique per inbound HTTP request |
| `fingerprint` | String | SHA-256 hash of normalized payload |
| `status` | Enum | `PROCESSING`, `COMPLETED`, `FAILED` |
| `result` | Mixed | Cached handler result (immutable once completed) |
| `metadata` | Object | Additional context |
| `expiresAt` | Date | TTL expiration timestamp |
| `createdAt` / `updatedAt` | Date | Mongoose timestamps |

## Indexes

| Index | Fields | Options |
|-------|--------|---------|
| `uniq_scope_idempotency_key` | `{ scope: 1, idempotencyKey: 1 }` | **unique** |
| `uniq_request_id` | `{ requestId: 1 }` | **unique** |
| `idx_payment_reference` | `{ paymentReference: 1 }` | sparse |
| `ttl_expires_at` | `{ expiresAt: 1 }` | TTL (`expireAfterSeconds: 0`) |
| `idx_status_created_at` | `{ status: 1, createdAt: 1 }` | cleanup queries |

## Headers

| Header | Purpose |
|--------|---------|
| `Idempotency-Key` | Required for payment routes when middleware `requireKey: true` |
| `X-Correlation-Id` | Correlation across services |
| `X-Request-Id` | Unique request identifier |
| `X-Payment-Reference` | Optional payment reference for reconciliation |

## Usage

```javascript
const { createMongoIdempotencyLayer, IdempotencyMiddleware } = require("./payments/infrastructure/idempotency");

const { repository, service, cleanup } = createMongoIdempotencyLayer({ scope: "checkout" });
await repository.ensureIndexes();

// Express (future Module wiring)
app.use("/api/v1/payments", IdempotencyMiddleware.attach({ requireKey: true, scope: "checkout" }));

// Orchestrator-compatible execute()
const outcome = await service.execute(
  "order-123-charge",
  { orderId: "123", amount: 5000 },
  async () => ({ status: "ok" }),
  { correlationId: "corr-1", requestId: "req-1", paymentReference: "pay-ref-1" }
);
// outcome.replayed === false on first run, true on duplicate
```

## TTL cleanup

MongoDB TTL index removes documents when `expiresAt` is reached (default **24 hours**).

`IdempotencyTtlCleanup` removes stale `PROCESSING` records older than **15 minutes** (crashed workers).

## Wiring into PaymentModule (future module)

```javascript
const { createMongoIdempotencyLayer } = require("./infrastructure/idempotency");
const { service } = createMongoIdempotencyLayer();
const paymentModule = new PaymentModule({ idempotencyService: service });
```

Module 1 does **not** auto-wire MongoDB into `PaymentModule` — in-memory default preserved for zero production regression.

## Errors

| Error | Code | When |
|-------|------|------|
| `DuplicateRequestError` | — | Same key, different payload fingerprint |
| `InProgressRequestError` | `IDEMPOTENCY_IN_PROGRESS` | Same key still processing (HTTP 409) |

## Tests

```bash
npm run test:idempotency          # unit tests
npm run test:idempotency:integration  # requires DB_URL or MONGODB_TEST_URI
```
