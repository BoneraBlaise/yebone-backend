# Module 2 — Payment Transaction Foundation

MongoDB-backed payment transaction persistence with validated lifecycle state transitions.

## Collection

`payment_transactions`

## States

`CREATED` → `PENDING` → `AUTHORIZED` → `CAPTURED` → `SETTLED`  
Terminal / failure paths: `FAILED`, `CANCELLED`, `EXPIRED`, `REFUNDED`, `PARTIALLY_REFUNDED`

Invalid transitions throw `InvalidStateTransitionError`.

## Usage

```javascript
const { createTransactionFoundation } = require("./payments/infrastructure/transactions");

const { repository, service } = createTransactionFoundation();
await repository.ensureIndexes();

const txn = await service.createTransaction({
  orderId: "ord-1",
  buyerId: "user-1",
  sellerId: "shop-1",
  amount: 15000,
  currency: "RWF",
  paymentReference: "pay-ref-1",
});

await service.transitionStatus(txn.transactionId, "PENDING");
await service.transitionStatus(txn.transactionId, "CAPTURED", {
  providerReference: "momo-ref-1",
  providerCode: "MTN_MOMO",
});
```

## Not wired

Module 2 is **not** injected into `PaymentModule` or production routes.

## Closure documentation

- [Repository Migration Strategy](./REPOSITORY_MIGRATION.md)
- [Metadata Policy](./METADATA_POLICY.md)
- [Payment Foundation Architecture](../PAYMENT_FOUNDATION_ARCHITECTURE.md)

## Tests

```bash
npm run test:transactions:all
```
