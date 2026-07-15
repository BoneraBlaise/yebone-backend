# Module 3 — Audit Foundation

Production-grade **append-only** audit logging for all financial events.

## Collection

`payment_audit_logs`

## Principles

- **Append-only** — no update or delete operations
- **Sanitized** — secrets, JWTs, card data, and provider secrets are redacted
- **Isolated** — not wired into `PaymentModule`, routes, or Payment Engine

## Usage

```javascript
const { createAuditFoundation, AuditAction, ResourceType, ActorType } =
  require("./payments/infrastructure/audit");

const { repository, service } = createAuditFoundation();
await repository.ensureIndexes();

await service.record({
  action: AuditAction.PAYMENT_CAPTURED,
  actorId: "user-123",
  actorType: ActorType.BUYER,
  resourceType: ResourceType.TRANSACTION,
  resourceId: "txn_abc",
  before: { status: "PENDING" },
  after: { status: "CAPTURED" },
  context: { correlationId: "corr-1", requestId: "req-1" },
});
```

## Immutability

- Repository exposes only `append()` for writes
- Mongoose schema blocks update/delete middleware hooks
- Records are frozen on return from `AuditService.record()`

## Tests

```bash
npm run test:audit:all
```

## Related docs

- [Payment Foundation Architecture](../PAYMENT_FOUNDATION_ARCHITECTURE.md)
- [Audit Migration Strategy](./AUDIT_MIGRATION_STRATEGY.md)
- [Correlation & Trace Strategy](./CORRELATION_TRACE_STRATEGY.md)
- [Audit Timeline Design](./AUDIT_TIMELINE_DESIGN.md)
- [Module 3 Closure](./MODULE_3_CLOSURE.md)
- [Transaction Metadata Policy](../transactions/METADATA_POLICY.md)
