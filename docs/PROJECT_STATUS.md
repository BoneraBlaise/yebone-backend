# Yebone — Project Status

**Last updated:** 2026-07-18  
**Checkpoint tag:** `development-checkpoint-phase4`

---

## Project Name

**Yebone** — AI-powered African marketplace platform.

---

## Current Architecture

Yebone is a layered marketplace with frozen foundation modules:

| Layer | Role | Status |
|-------|------|--------|
| **Payment Foundation** | Provider orchestration, ledger, webhooks, payouts | Frozen |
| **Marketplace Core** | Configuration, lifecycle, health, order/payment hooks | Frozen |
| **Vendor Platform** | Shop registration, seller profile, verification, settings | Frozen |
| **Product Catalog** | Product CRUD, reviews, likes, media, validation | Frozen |
| **Legacy v2 API** | Express controllers at `/api/v2/*` | Production baseline |
| **Frontend** | React legacy `App.js` + Redux + design system | Production baseline |

Integration rule: upper layers depend on lower layers — Payment is never dependent on Marketplace, Vendor, or Catalog.

---

## Completed Phases

| Phase | Name | Tag |
|-------|------|-----|
| 1 | Payment Module | `payment-foundation-v10` |
| 2 | Marketplace Core | `marketplace-core-v1` |
| 3 | Vendor Management | `vendor-management-v1` |
| 4 | Product Catalog | `product-catalog-v1` |

---

## Frozen Modules

Do not modify without explicit unfreeze:

- `payments/` — Payment Foundation
- `marketplace/core/` — Marketplace Core architecture
- `marketplace/vendor/` — Vendor Platform
- `marketplace/catalog/` — Product Catalog platform

Integrate only through public interfaces, hooks, and Marketplace Core services.

---

## Stable Tags

| Tag | Commit | Description |
|-----|--------|-------------|
| `payment-foundation-v10` | `fea88eb` | Phase 4A payment stabilization |
| `marketplace-core-v1` | `f15515c` | Marketplace Core backbone |
| `vendor-management-v1` | `9cb9ecf` | Vendor Platform + ShopService |
| `product-catalog-v1` | `4cd6cd7` | Product Catalog + ProductService |
| `development-checkpoint-phase3` | `1742b00` | Pre–Product Catalog checkpoint |
| `development-checkpoint-phase4` | *(this checkpoint)* | Official baseline before Phase 5 |

---

## Current Repository Status

### Backend (`guriraline_server-main`)

| Item | Value |
|------|-------|
| Branch | `feature/product-catalog` |
| HEAD | `4cd6cd7` (matches `product-catalog-v1`) |
| Working tree | Clean except one untracked ops script |

### Frontend (`guriraline_app-main`)

| Item | Value |
|------|-------|
| Branch | `feature/payment-foundation` |
| HEAD | `eced0b2` (P0 marketplace-core frontend fixes) |
| Working tree | Clean |

Frontend phase tags are not mirrored in the frontend repo; backend tags are the canonical phase baseline.

---

## Known Technical Debt

- Order controller remains fat — only create flow extracted to `OrderService`
- Dual UI stacks on frontend (`vendor-ui/`, `customer-ui/`, `admin-ui/`) — archived, not wired
- PayLater modules deprecated but retained for migration script compatibility
- Duplicate `TransactionRepository` classes flagged by architecture verifier
- Legacy `Shop.availableBalance` coexists with v1 payment wallet/payout APIs
- Provider payout workflows partially stubbed in Payment Foundation
- No centralized search, notifications, or delivery layer
- Some legacy UI components predate full responsive design-system adoption

---

## Deferred Work

Explicitly out of scope for Phases 1–4:

- Orders canonical layer (Phase 5)
- Search engine
- Notifications
- Inventory redesign beyond catalog fields
- Categories redesign
- Delivery
- YEBO AI integration
- Mobile native app
- Cart/checkout redesign

---

## Next Phase

**Phase 5 — Orders**

Formalize order business logic into a canonical orders layer while preserving existing APIs, payment integration hooks, and legacy UI flows.

---

## Architecture Principles

Follow this order for all future work:

1. **Inspect** — audit what exists before building
2. **Reuse** — extend production-worthy modules
3. **Upgrade** — improve boundaries, not rewrite
4. **Consolidate** — remove duplicates and parallel implementations
5. **Freeze** — tag and lock completed layers

Never create a second implementation if one already exists.

---

## Frontend Architecture

All future UI work must follow `docs/FRONTEND_ARCHITECTURE.md`.

Implement each page once. Support mobile, tablet, and desktop in a single responsive codebase.
