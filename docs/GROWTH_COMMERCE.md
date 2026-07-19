# Growth Commerce — Phase 10

**Tag:** `growth-commerce-v1`  
**Baseline:** `enterprise-certification-remediation-v1`  
**Branch:** `feature/growth-commerce`

Growth Commerce extends the certified platform without modifying frozen core modules. All business rules delegate to existing Growth, Search, Orders, and Platform Integration services.

---

## Module Location

```
marketplace/growth-commerce/
├── GrowthCommercePlatform.js      # Composition root
├── GrowthCommerceConfigStore.js   # Feature settings + platform flag sync
├── CampaignRepository.js
├── CampaignService.js
├── CampaignStateMachine.js
├── CampaignAutomationService.js
├── PromotionEngineService.js      # Delegates to GrowthPlatform.validatePromotion
├── HomepageMerchandisingService.js
├── AffiliateCommerceService.js    # Extends Growth referral/share links
├── MarketingDashboardService.js
├── GrowthCommerceSearchBridge.js  # Wraps SearchPlatform + campaign badges
├── GrowthCommerceAIService.js     # Campaign/deal recommendations API
├── GrowthCommerceAccess.js        # PlatformAuthService + feature guards
├── GrowthCommerceHealth.js
└── index.js                       # Express routes
```

**API base:** `/api/v2/marketplace/growth-commerce`

---

## Features

| Feature | Description |
|---------|-------------|
| Campaign Management | Vendor campaigns: flash, scheduled, weekend, holiday, featured |
| Promotion Engine | Reuses Growth Platform validation (no duplicate rules) |
| Homepage Merchandising | Super Admin configurable sections (no hardcoded homepage) |
| Affiliate & Ambassador | Share links + ambassador profiles via Growth referral |
| Marketing Dashboard | Vendor + admin CTR, conversion, ROI metrics |
| Campaign Automation | Scheduled start/end + homepage activation/removal |
| Search Integration | Enriched search results with promotion badges |
| AI Integration | Recommendations endpoint for YEBO AI / frontend |
| Responsive Web | Admin + vendor panels + homepage sections (React) |

---

## Campaign Lifecycle

`draft → scheduled → active ↔ paused → expired → archived`

Automation (`POST /automation/run`) transitions campaigns by `startDate` / `endDate` and updates homepage sections when `homepageSection` is set.

---

## RBAC

| Role | Capabilities |
|------|--------------|
| Super Admin | Homepage, configuration, admin dashboard, ambassadors, automation |
| Vendor | Create/pause/resume/duplicate campaigns, vendor analytics |
| User | Affiliate dashboard, ambassador profile, campaign assignment |

Uses `PlatformAuthService` via `GrowthCommerceAccess`.

---

## Feature Flags

Domain: `growthCommerce` in `PlatformFeatureFlagService`.

Individual toggles: `campaigns`, `promotions`, `homepage`, `affiliates`, `ambassadors`, `marketingDashboard`, `automation`, `searchIntegration`, `aiIntegration`.

---

## Audit & Observability

- Audit: `PlatformAuditAdapter` → `PlatformAuditService`
- Metrics: `PlatformObservabilityService` (campaign creation events)

---

## Frontend Integration

| Surface | Path |
|---------|------|
| Super Admin | `/admin/growth-commerce` |
| Vendor | `/dashboard-campaigns` |
| Public homepage | Configurable sections via `GET /homepage` |
| Search | Enriched endpoint with fallback to legacy search |
| Service client | `src/services/growthCommerceService.js` |

---

## Verification

```bash
npm run test:growth-commerce
npm run verify:growth-commerce
```

---

## Out of Scope (Phase 10)

Loyalty, Cashback, Wallet, Advanced Analytics, Native Mobile Apps — deferred to future roadmap phases.
