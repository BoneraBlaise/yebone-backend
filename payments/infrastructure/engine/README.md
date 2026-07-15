# Module 4 — Payment Engine Bootstrap (Foundation Only)

Production-ready **composition root** for the future Payment Engine.

## Scope

This module builds the bootstrap architecture only:

- Payment Engine orchestration skeleton
- Provider registry and resolver (metadata only — no API calls)
- Feature flags (all default **OFF**)
- Dependency injection container
- Foundation service assembly (Modules 1–3)

## Not in scope

- Provider integration / API calls
- Event Bus
- Wallet
- Webhooks
- PaymentModule wiring
- Route or runtime registration

## Usage

```javascript
const { createPaymentEngineBootstrap } = require("./payments/infrastructure/engine");

const bootstrap = createPaymentEngineBootstrap();

// All flags default OFF — engine.charge() throws until explicitly enabled
bootstrap.featureFlags.enable("paymentEngineEnabled");
bootstrap.featureFlags.enable("mtnEnabled");
bootstrap.providerRegistry.enable("MTN_MOMO");

await bootstrap.engine.charge({
  orderId: "ord-1",
  buyerId: "buyer-1",
  sellerId: "seller-1",
  amount: 5000,
  providerCode: "MTN_MOMO",
  paymentMethod: "MOBILE_MONEY",
  countryCode: "RW",
});
```

## Injecting services (tests / custom wiring)

```javascript
const { createPaymentEngine } = require("./payments/infrastructure/engine");

const { engine } = createPaymentEngine({
  idempotencyService: mockIdempotency,
  transactionService: mockTransactions,
  auditService: mockAudit,
});
```

## Feature flags

| Flag | Default |
|------|---------|
| `paymentEngineEnabled` | `false` |
| `mtnEnabled` | `false` |
| `airtelEnabled` | `false` |
| `flutterwaveEnabled` | `false` |
| `paypackEnabled` | `false` |
| `stripeEnabled` | `false` |

## Provider registry

Supports `register()`, `resolve()`, `list()`, `enable()`, `disable()`, country lookup, and payment method lookup.

Default descriptors registered for: `MTN_MOMO`, `AIRTEL_MONEY`, `PAYPACK`, `FLUTTERWAVE`, `STRIPE`.

## Tests

```bash
npm run test:engine:all
```

## Health check

```javascript
const report = bootstrap.engine.health();
// report.healthy === true (internal readiness)
// report.paymentEngineEnabled === false (default)
```

## Related docs

- [Engine Health Contract](./ENGINE_HEALTH_CONTRACT.md)
- [Provider Capability Matrix](./PROVIDER_CAPABILITY_MATRIX.md)
- [Dependency Validation](./DEPENDENCY_VALIDATION.md)
- [Module 4 Closure](./MODULE_4_CLOSURE.md)
- [Payment Foundation Architecture](../PAYMENT_FOUNDATION_ARCHITECTURE.md)
