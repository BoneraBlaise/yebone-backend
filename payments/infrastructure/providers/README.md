# Module 9 — Provider Adapter Foundation

Skeleton provider adapters for the Payment Foundation. **Not wired to production.**

## Scope

- Provider adapter interface (`charge`, `verify`, `refund`, `payout`, `webhook`, `health`)
- Registry integration with Module 4 `ProviderRegistry`
- Resolver by `providerCode`, `country`, `currency`, `paymentMethod`
- Capability validation before execution
- Immutable normalized models: `ProviderRequest`, `ProviderResponse`, `ProviderError`
- Feature flags — all providers disabled by default
- Health contract: `READY`, `DISABLED`, `UNREGISTERED`
- Mock responses only — no HTTP, SDKs, or credentials

## Supported Providers (Skeleton)

| Code | Adapter |
|------|---------|
| `MTN_MOMO` | `MTNMoMoAdapter` |
| `AIRTEL_MONEY` | `AirtelMoneyAdapter` |
| `FLUTTERWAVE` | `FlutterwaveAdapter` |
| `STRIPE` | `StripeAdapter` |
| `PAYPACK` | `PaypackAdapter` |

## Webhook Verification (Module 10 ready)

All adapters implement `verifyWebhook()` and `verifySignature()` via `WebhookVerificationInterface`.
Module 9 returns mock results only — no cryptography.

## Provider Reference (Module 10 ready)

See `PROVIDER_REFERENCE.md`. Adapters expose `providerReference` with normalized optional reference fields. References are optional metadata only — not transmitted at Module 9.

## Provider Idempotency (Module 10 ready)

See `PROVIDER_IDEMPOTENCY.md`. Adapters expose `providerIdempotency` with `buildKey()`, `validateKey()`, and `supportsProviderIdempotency()`. Keys are optional metadata only — not transmitted at Module 9.

## Usage (Foundation Only)

```javascript
const { createProviderFoundation } = require("./providers");

const foundation = createProviderFoundation();
// Explicit enable required — nothing runs by default
foundation.featureFlags.enable("mtnEnabled");
foundation.providerRegistry.enable("MTN_MOMO");

const { adapter } = foundation.adapterResolver.resolve({
  providerCode: "MTN_MOMO",
  country: "RW",
  currency: "RWF",
  paymentMethod: "MOBILE_MONEY",
});

const response = await adapter.charge({
  amount: 1000,
  currency: "RWF",
  reference: "order-123",
});
```

## Boundaries

- Does **not** modify `PaymentEngine`, `PaymentModule`, routes, or server wiring
- Does **not** invoke external provider APIs
- Adapters register onto existing `ProviderRegistry.adapter` slots

## Foundation Freeze

Built from tag `payment-foundation-v1` (Modules 1–8 complete).
