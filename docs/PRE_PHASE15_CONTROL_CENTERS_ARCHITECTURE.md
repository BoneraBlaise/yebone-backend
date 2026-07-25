# PRE-PHASE 15 — Super Admin Control Centers Architecture

## Overview

Super Admin control centers are production modules wired to persisted platform configuration. Business values live in MongoDB (and file fallback in development), not in frontend or backend source code.

## Architecture Pattern

**Inspect → Reuse → Extend → Verify → Freeze**

| Layer | Responsibility |
|-------|----------------|
| `PlatformConfigurationStore` | Versioned singleton (`model/platformConfiguration.js`) for business values |
| `PlatformConfigurationBridge` | Aggregate reads, section updates, banner CRUD, commission rule sync |
| Domain platforms | Growth, Delivery, Growth Commerce, Property & Mobility — unchanged cores |
| Admin UI | `src/components/AdminControlCenters/` — shared shell + dedicated centers |

## Configuration Flow

```
Super Admin UI
    ↓ PUT /marketplace/integration/platform-configuration/section/:section
PlatformConfigurationBridge
    ↓ persist + audit
PlatformConfigurationStore (MongoDB)
    ↓ sync (when applicable)
Growth CommissionRuleAdminService (CATEGORY / REFERRAL rules)
    ↓
Future orders use CommissionCalculator + GrowthCommissionOrchestrator
```

## API Surface

| Endpoint | Purpose |
|----------|---------|
| `GET /integration/platform-configuration` | Aggregated platform + domain configs |
| `PUT /integration/platform-configuration/section/:section` | Update business section |
| `POST /integration/platform-configuration/banners` | Create/update banner |
| `GET /growth/commission-history` | Commission ledger rows |
| `GET /growth/referral/admin/dashboard` | Referrers, codes, fraud |
| `GET/PUT /ai/admin/products` | AI marketplace pricing |

## Frozen Modules

Payment Foundation, Marketplace Core, Vendor, Orders, Search, Growth Commerce engine, Seller Operations, Property & Mobility core, YEBO AI runtime, Trust & Buyer Protection — extended via bridges and configuration APIs only.

## Phase Boundary

This milestone is **PRE-PHASE 15**. Do not start Phase 15 work from this branch.
