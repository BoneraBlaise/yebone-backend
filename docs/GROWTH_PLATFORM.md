# Growth Platform (Phase 9.0 → 9.1)

**Tags:** `growth-platform-v1`, `growth-platform-completion-v1`  
**Status:** Growth Platform complete — frozen

Phase 9.0 unifies referral, affiliate, coupon, promotion validation, commission orchestration, reward ledger, growth configuration, feature flags, and audit under a single orchestration layer at `marketplace/growth/`. Phase 9.1 completes Super Admin rule administration, BRAND strategy, configurable priority, rule simulator, coupon redemption at order creation, and multi-vendor coupon validation.

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
  CommissionRuleAdminService.js
  CommissionRuleSimulatorService.js
  CouponRedemptionService.js
  CouponStatisticsService.js
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
| GET | `/commission-rules` | Super Admin | List/search commission rules |
| POST | `/commission-rules` | Super Admin | Create commission rule |
| PUT | `/commission-rules/:id` | Super Admin | Update commission rule |
| DELETE | `/commission-rules/:id` | Super Admin | Archive/delete commission rule |
| POST | `/commission-rules/:id/duplicate` | Super Admin | Duplicate rule |
| POST | `/commission-rules/:id/archive` | Super Admin | Archive rule |
| POST | `/commission-rules/:id/restore` | Super Admin | Restore archived rule |
| POST | `/commission-rules/bulk/*` | Super Admin | Bulk enable/disable/delete |
| PUT | `/commission-rules/priorities` | Super Admin | Update rule priorities |
| POST | `/commission-rules/simulate` | Super Admin | Rule simulator (real engine) |
| GET | `/commission-analytics` | Super Admin | Commission analytics |
| GET | `/coupons/statistics` | Super Admin | Coupon statistics (read-only) |
| GET | `/coupons/usage` | Super Admin | Coupon usage history |
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

## Commission rules (Phase 9.1)

Supported rule types: `GLOBAL`, `PRODUCT`, `BRAND`, `CATEGORY`, `VENDOR`, `REFERRAL`, `CAMPAIGN`.

### Priority hierarchy (default)

```
Product (3)
  ↓
Brand (4)
  ↓
Category (5)
  ↓
Vendor (6)
  ↓
Platform Default / GLOBAL (8)
```

Priorities are configurable per rule via Super Admin. The Payments Commission Engine resolves the winning base rule using stored `priority` values.

### Rule simulator

`POST /commission-rules/simulate` runs the real Payments Commission Engine against active configured rules and returns:

- Winning rule
- Applied percentage
- Priority
- Calculation breakdown
- Conflict resolution notes

### Super Admin UI

- `#admin-growth` — feature toggles
- `#admin-commission-rules` — full CRUD, bulk actions, priority editor, simulator
- `#admin-coupon-monitor` — read-only coupon statistics

## Promotion validation

Unified via `PromotionValidationService`:

- `coupon`
- `flash_sale`
- `event`
- `product_discount`
- `brand_promotion`
- `category_promotion`
- `vendor_promotion`

Pass `unified: true` to evaluate all promotion types in one pipeline.

## Coupon lifecycle (Phase 9.1)

1. Checkout apply → `POST /validate-coupon` (server-side, multi-vendor aware)
2. Payment → order payload includes `couponCode` and `attributionTokens`
3. Order creation → `CouponRedemptionService.validateAndRedeem()` re-validates, calculates discount server-side, increments `usageCount`
4. Client-side discount amounts are never trusted at order commit

## Reward ledger

Extends existing `Commission` model sales subdocuments with:

- `rewardStatus`, `ruleUsed`, `referralUsed`, `couponUsed`
- `approvalTimestamp`, `paymentReference`, `walletReference`

Statuses: pending, approved, paid, cancelled, refunded.

## Super Admin

Frontend: `AdminGrowthSettings`, `AdminCommissionRules`, and `AdminCouponMonitor` in Super Admin dashboard.

Controls affiliate, referral, coupons, promotions, commission rules, and reward ledger without restart.

## Verification

```bash
npm run verify:growth-platform-completion
```

## Out of scope (Phase 9.0)

Campaign scheduling, loyalty, cashback, influencer/ambassador programs, wallet payouts, advanced analytics.
