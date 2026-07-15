# Provider Capability Matrix — Module 4 Closure

**Branch:** `feature/payment-foundation`  
**Status:** Metadata only — no provider API calls

---

## Capability Vocabulary

| Capability | Alias examples | Description |
|------------|----------------|-------------|
| `PAYMENTS` | `payment`, `payments` | Collect/charge funds |
| `REFUNDS` | `refund`, `refunds` | Return funds to buyer |
| `PAYOUTS` | `payout`, `payouts` | Disburse to seller/bank/mobile |
| `WEBHOOKS` | `webhook`, `webhooks` | Async provider event delivery |
| `SUBSCRIPTIONS` | `subscription`, `subscriptions` | Recurring billing |
| `ESCROW` | `escrow` | Platform escrow hold/release (future) |
| `WALLET` | `wallet` | Provider-native wallet (future) |

Normalization is handled by `ProviderCapabilities.js` — no provider-specific `if` statements in resolver code.

---

## Descriptor Schema

Each registry entry includes:

```javascript
{
  code: "MTN_MOMO",
  name: "MTN Mobile Money",
  capabilities: ["PAYMENTS", "REFUNDS", "PAYOUTS", "WEBHOOKS"],
  supportedCountries: ["RW", "UG", "GH", "CM"],
  supportedCurrencies: ["RWF", "UGX", "GHS", "XAF"],
  supportedMethods: ["MOBILE_MONEY"],
  supportedOperations: [...],  // mirrors capabilities
  enabled: false,
  supports(operation) { ... }  // generic capability check
}
```

---

## Default Matrix

| Provider | Payments | Refunds | Payouts | Webhooks | Subscriptions | Countries | Currencies |
|----------|----------|---------|---------|----------|---------------|-------------|------------|
| **MTN_MOMO** | ✅ | ✅ | ✅ | ✅ | — | RW, UG, GH, CM | RWF, UGX, GHS, XAF |
| **AIRTEL_MONEY** | ✅ | ✅ | ✅ | ✅ | — | RW, UG, KE, TZ | RWF, UGX, KES, TZS |
| **PAYPACK** | ✅ | ✅ | — | ✅ | — | RW | RWF |
| **FLUTTERWAVE** | ✅ | ✅ | ✅ | ✅ | ✅ | RW, NG, GH, KE, UG, TZ | RWF, NGN, GHS, KES, UGX, TZS, USD |
| **STRIPE** | ✅ | ✅ | ✅ | ✅ | ✅ | US, GB, RW | USD, GBP, RWF, EUR |

*ESCROW and WALLET are platform capabilities — not assigned to default providers until Module 8+ adapter work.*

---

## Query API

```javascript
const provider = registry.resolve("MTN_MOMO");
provider.supports("refund");   // true
provider.supports("wallet");   // false

resolver.supports("STRIPE", "subscription");  // true
registry.findByCapability("payouts");         // MTN, Airtel, Flutterwave, Stripe
resolver.listAvailable({ countryCode: "RW", capability: "payments" });
```

---

## Source Files

| File | Role |
|------|------|
| `ProviderCapabilities.js` | Capability enum, normalization, `supports()` |
| `ProviderCapabilityMatrix.js` | Default per-provider metadata |
| `ProviderRegistry.js` | Descriptor storage + `findByCapability()` |
| `ProviderResolver.js` | `supports(code, operation)` delegation |

---

## Future Module 8 (MTN MoMo)

Module 8 will register an **adapter reference** on the existing `MTN_MOMO` descriptor. Capability matrix remains unchanged — adapter must conform to declared capabilities.
