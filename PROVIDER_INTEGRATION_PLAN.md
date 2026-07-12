# Provider Integration Plan

**Baseline:** `v1.0-production-baseline`  
**Prerequisite:** Architecture verified; no provider code implemented yet  
**Single entry point:** `MarketplacePaymentFacade` (unchanged)

---

## Implementation Order

Providers are integrated **in this sequence only**. Each provider must pass verification before the next begins.

| Order | Provider | Enum | Placeholder File |
|-------|----------|------|------------------|
| 1 | MTN MoMo | `MTN_MOMO` | `payments/providers/MTNMoMoProvider.js` |
| 2 | Airtel Money | `AIRTEL_MONEY` | `payments/providers/AirtelMoneyProvider.js` |
| 3 | Paypack | `PAYPACK` | `payments/providers/PaypackProvider.js` |
| 4 | Flutterwave | `FLUTTERWAVE` | `payments/providers/FlutterwaveProvider.js` |
| 5 | Stripe | `STRIPE` | `payments/providers/StripeProvider.js` |

---

## Integration Rules (Non-Negotiable)

1. **Facade only** — No controller, route, or marketplace code may call a provider directly.
2. **Interface only** — Each adapter implements `PaymentProviderInterface` / extends `BasePlaceholderProvider`.
3. **PaymentService boundary** — Provider execution flows:  
   `Workflow → PaymentService → ProviderResolver → Provider`
4. **No SDK in controllers** — SDK imports allowed only inside `payments/providers/<Provider>.js`.
5. **No API contract changes** — v1 and v2 request/response shapes remain stable.
6. **No business logic changes** — Orders, checkout, products, auth untouched.
7. **Feature flag** — Enable per provider via `PaymentConfig` / `providerIntegrations` when ready.
8. **Secrets via platform** — Credentials resolved through `platform/secrets`, not hardcoded.

---

## Per-Provider Checklist

For each provider (MTN → Airtel → Paypack → Flutterwave → Stripe):

- [ ] Implement `PaymentProviderInterface` methods in provider class
- [ ] Register in `PaymentFactory`
- [ ] Map payment methods in `PaymentConfig.methodProviderMap`
- [ ] Add env placeholders to `.env.example` (no real keys in repo)
- [ ] Unit/integration tests against sandbox (outside baseline)
- [ ] Run `verify-architecture.js` — must pass
- [ ] Run `verify-legacy-migration.js` — must pass
- [ ] Confirm no new SDK imports outside `payments/providers/`
- [ ] Confirm `MarketplacePaymentFacade` remains sole entry point

---

## Phase 1: MTN MoMo

**Scope:** Mobile money (Rwanda) — authorize, capture, refund stubs  
**Files to modify:** `MTNMoMoProvider.js`, `PaymentFactory.js`, `PaymentConfig.js` (if needed)  
**Files NOT to modify:** Controllers, `MarketplacePaymentFacade`, orchestrators (unless adding provider-agnostic hooks)

---

## Phase 2: Airtel Money

**Scope:** Mobile money — same interface surface as MTN  
**Dependency:** MTN patterns established in Phase 1

---

## Phase 3: Paypack

**Scope:** Wallet / local payment rail  
**Dependency:** Mobile money providers validated

---

## Phase 4: Flutterwave

**Scope:** Card + bank + regional methods  
**Dependency:** Prior providers stable

---

## Phase 5: Stripe

**Scope:** International cards (last — broadest blast radius)  
**Dependency:** All regional providers complete  
**Note:** Legacy v2 `stripeapikey` route already bridges via facade; Stripe provider replaces placeholder execution only

---

## Verification After Each Provider

```bash
node payments/scripts/verify-architecture.js
node payments/scripts/verify-legacy-migration.js
node platform/scripts/verify-platform.js
```

Target: all scripts PASS; architecture score ≥ 96.

---

## Out of Scope

- Frontend payment UI changes (separate phase)
- MongoDB payment repository implementations (optional parallel track)
- Real PostgreSQL migration
- Order/settlement bridge in `controller/order.js`

---

*Plan locked to baseline `v1.0-production-baseline`. Do not reorder providers without architecture review.*
