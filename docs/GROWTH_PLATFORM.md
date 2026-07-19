# Growth Platform (Phase 9.0)

**Tag:** `growth-platform-v1`  
**Status:** Growth Platform MVP complete — frozen

Phase 9.0 unifies referral, affiliate, coupon, promotion validation, commission orchestration, reward ledger, growth configuration, feature flags, and audit under a single orchestration layer at `marketplace/growth/`. Existing Guriraline models and the Payments Commission Engine are reused — not replaced.

## Module location

```
marketplace/growth/
  GrowthPlatform.js
  GrowthConfigurationPlatform.js
  GrowthConfigStore.js
  GrowthFeatureFlagService.js
  GrowthOperationGuard.js
  GrowthAuditService.js
  GrowthAnalyticsService.js
  GrowthLegacyAdapter.js
  ReferralAttributionService.js
  CouponValidationService.js
  PromotionValidationService.js
  GrowthCommissionOrchestrator.js
  RewardLedgerService.js
  GrowthSettingsDefaults.js
  index.js
model/growthConfiguration.js
data/growth-configuration/   # file fallback
```

## Architecture

| Responsibility | Owner |
|----------------|-------|
| Commission calculation | Payments Commission Engine (`createCommissionEngine`) |
| Growth orchestration | `GrowthPlatform` |
| Order triggers | `OrderService` |
| Legacy data reads | `GrowthLegacyAdapter` |
| Super Admin config | `GrowthConfigurationPlatform` |

**Rule:** Never duplicate commission logic. Growth configures and invokes `CommissionRuleResolver`, `CommissionCalculator`, and `CommissionEngine`.

## Persistence

| Layer | Purpose |
|-------|---------|
| MongoDB `GrowthConfiguration` | Primary store (singleton) |
| File fallback | `data/growth-configuration/` |
| Memory | Tests via `useMemoryOnly: true` |

## API

Base: `/api/v2/marketplace/growth`

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/health` | Public | Platform health |
| GET | `/features` | Public | Feature flag snapshot |
| GET | `/configuration` | Super Admin | Current settings + commission rules |
| PUT | `/configuration` | Super Admin | Update settings + audit |
| GET | `/configuration/audit` | Super Admin | Audit history |
| GET | `/audit` | Super Admin | Audit history alias |
| GET | `/referral` | User | Referral profile |
| POST | `/referral` | User | Join referral program |
| POST | `/referral/attribution` | Public | Create signed attribution token |
| POST | `/referral/track-click` | Public | Track referral click |
| POST | `/validate-coupon` | Public | Server-side coupon validation |
| POST | `/validate-promotion` | Public | Unified promotion validation |
| GET | `/reward-ledger` | User | Reward ledger entries |

Legacy `/api/v2/commission` and coupon CRUD remain available. New integrations should prefer Growth APIs.

## Feature flags

`GrowthFeatureFlagService` — reuse in all future growth modules:

- `isAffiliateEnabled()`
- `isReferralEnabled()`
- `isCouponEnabled()`
- `isPromotionEnabled()`
- `isCommissionRulesEnabled()`
- `isRewardLedgerEnabled()`

## Referral attribution

- Signed HMAC attribution tokens via `ReferralAttributionService`
- Server-side resolution in `GrowthPlatform.resolveReferralCode()`
- **No localStorage attribution** — frontend stores tokens in React context only
- Order creation passes `attributionTokens[]` to `OrderService`

## Promotion validation

Unified via `PromotionValidationService`:

- `coupon`
- `flash_sale`
- `event`
- `product_discount`

## Reward ledger

Extends existing `Commission` model sales subdocuments with:

- `rewardStatus`, `ruleUsed`, `referralUsed`, `couponUsed`
- `approvalTimestamp`, `paymentReference`, `walletReference`

Statuses: pending, approved, paid, cancelled, refunded.

## Super Admin

Frontend: `AdminGrowthSettings` in Super Admin dashboard (`#admin-growth`).

Controls affiliate, referral, coupons, promotions, commission rules, and reward ledger without restart.

## Verification

```bash
npm run verify:growth-platform
```

## Out of scope (Phase 9.0)

Campaign scheduling, loyalty, cashback, influencer/ambassador programs, wallet payouts, advanced analytics.
