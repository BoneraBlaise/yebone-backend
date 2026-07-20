# Property & Mobility — Phase 12

**Tag:** `property-mobility-v1` · **Remediation:** `property-mobility-remediation-v1`  
**Baseline:** `seller-operations-v1`  
**Branch:** `feature/property-mobility`

Property & Mobility extends the certified marketplace with listings for apartments, houses, land, cars, and commercial property — without creating a separate platform or rewriting frozen modules.

---

## Module Location

```
marketplace/property-mobility/
├── PropertyMobilityPlatform.js
├── PropertyMobilityConfigStore.js
├── PropertyMobilityRepository.js
├── PropertyMobilitySearchBridge.js
├── PropertyMobilityPromotionBridge.js
├── PropertyMobilityInboxBridge.js
├── ListingService.js
├── VerificationService.js
├── AgencyService.js
├── OfferService.js
├── ReportService.js
├── ModerationService.js
├── PropertyMobilityAccess.js
├── PropertyMobilityHealth.js
└── index.js
```

**API base:** `/api/v2/marketplace/property-mobility`

---

## Categories

| Category | Type |
|----------|------|
| apartments | Property |
| houses | Property |
| land | Property |
| commercial_property | Property |
| cars | Vehicle |

---

## Features

| Feature | Description |
|---------|-------------|
| Listings | CRUD, publish, pause, delete; photos, videos, price, location, coordinates, amenities, documents |
| Search | Property/vehicle/location/price filters; verified/featured; newest; optional Search Platform product cross-search |
| Promotions | Featured, homepage, search boost, sponsored — configurable pricing; Growth Commerce homepage bridge |
| Verified Badge | Yebone Verified — configurable fee (default 10,000 RWF) and duration (default 60 days) |
| Super Admin Config | All promotion, verification, and agency pricing/durations configurable |
| Agency Accounts | Real estate agencies and car dealers with configurable subscription duration and listing limits |
| Communication | Contact, appointment, offers via existing Inbox (Conversation/Messages) |
| Reporting | User reports with admin moderation |
| Moderation | Approve, reject, suspend, verify, feature, remove listings |

---

## Platform Integration

| Concern | Integration |
|---------|-------------|
| Feature flag | `propertyMobility` in `PlatformFeatureFlagService` |
| RBAC | `PropertyMobilityAccess` → `PlatformAuthService` |
| Audit | `PlatformAuditAdapter` |
| Search | `PropertyMobilitySearchBridge`; optional `SearchPlatform` delegation |
| Promotions | `PropertyMobilityPromotionBridge`; Growth Commerce homepage sections |
| Inbox | `PropertyMobilityInboxBridge` → Conversation/Messages models |
| Configuration sync | `PropertyMobilityConfigStore` → `PlatformFeatureFlagService` (Growth Commerce pattern) |

---

## Admin Configuration

| Setting | Location | Default |
|---------|----------|---------|
| Verified badge price | `pricing.verifiedBadgePrice` | 10,000 RWF |
| Verification duration | `pricing.verificationDurationDays` | 60 days |
| Featured / homepage / search boost / sponsored prices | `pricing.*Price` | See `DEFAULT_PRICING` |
| Promotion duration | `pricing.promotionDurationDays` | 30 days |
| Homepage promotion slot limit | `settings.promotions.homepagePromotionLimit` | 12 |
| Agency subscription price | `pricing.agencySubscriptionPrice` | 50,000 RWF |
| Agency subscription duration | `pricing.agencySubscriptionDurationDays` | 30 days |
| Agency unlimited listings | `settings.agencies.unlimitedListings` | ON |
| Agency maximum listings | `settings.agencies.maxListings` | 100 |

Module configuration updates sync to platform feature flags so runtime guards and services share one effective source of truth.

---

## Verification

```bash
npm run test:property-mobility
npm run verify:property-mobility
```

---

## Frontend Routes

| Role | Route |
|------|-------|
| Public | `/property-mobility` |
| Super Admin | `/admin/property-mobility` |
| Owner/Vendor | `/dashboard-property-mobility` |

**Property & Mobility frozen at `property-mobility-v1`. Production remediation frozen at `property-mobility-remediation-v1`.**
