# Yebone Platform Changelog

All frozen milestone tags and major architectural changes.

Format: `[tag]` — summary of architectural impact.

---

## [yebo-ai-design-v1] — YEBO AI Architecture Design Freeze

- Canonical AI orchestration architecture (`docs/YEBO_AI_ARCHITECTURE.md`)
- Tool, prompt, provider, security, and roadmap design documents
- `marketplace/ai/` module design — no implementation
- Phase 7 split into 7 independently freezeable milestones (7.1–7.7)
- Frontend YIP reuse plan — gateway wiring, no UI redesign

---

## [platform-pre-ai-v1] — Platform Freeze Checkpoint

- Canonical platform architecture documented (`docs/PLATFORM_ARCHITECTURE.md`)
- Full verification suite passing; foundation declared complete before YEBO AI
- Release notes, changelog, and AI integration guide finalized

---

## [search-production-v1] — Search Production Hardening

- Unicode-safe query normalization (`SearchTextNormalizer`)
- Centralized validation, compatibility helpers, expanded production tests
- Frontend architecture frozen (`FRONTEND_ARCHITECTURE.md` in frontend repo)
- Rate limiting, NoSQL injection guards, pagination caps

---

## [search-v1] — Search & Discovery Platform

- New `marketplace/search/` platform and `SearchService`
- Reuses `ProductSearch.prepareFilters()` from frozen catalog
- Legacy routes: `/api/v2/search/*`, compatible `/product/get-all-products?filters`
- Server-backed discovery with pagination, sorting, suggestions

---

## [orders-production-v1] — Orders Production Hardening

- Idempotent order creation (`Idempotency-Key`, MongoDB persistence)
- Single MongoDB transaction for inventory + order + referral
- Atomic inventory reservation (prevent overselling)
- Centralized order state machine with legacy status mapping
- Auth, ownership, rate limiting on order endpoints

---

## [orders-v1] — Orders Platform (Phase 5)

- `marketplace/orders/` platform and expanded `OrderService`
- Thin `controller/order.js` adapter
- Payment session integration via frozen payment hooks
- Health endpoint: `/api/v2/marketplace/orders/health`

---

## [product-catalog-v1] — Product Catalog Platform (Phase 4)

- `marketplace/catalog/` platform and `ProductService` extraction
- Product validation, media, pricing, inventory prep
- `ProductSearch` preparation stub for Phase 6
- Legacy product routes preserved at `/api/v2/product/*`

---

## [vendor-management-v1] — Vendor Management Platform (Phase 3)

- `marketplace/vendor/` platform and `ShopService` extraction
- Seller registration, verification, settings
- Legacy shop routes preserved at `/api/v2/shop/*`

---

## [marketplace-core-v1] — Marketplace Core (Phase 2)

- Canonical marketplace layer: config, lifecycle, health, hooks
- Shared service registry (`OrderService`, `ProductService`, `ShopService`)
- Payment integration hooks (marketplace → payment only)
- Health endpoint: `/api/v2/marketplace/health`

---

## [payment-foundation-v10] — Payment Foundation (Phase 1)

- Provider-independent payment engine, ledger, idempotency, webhooks
- Legacy facade bridge for v2 marketplace payment routes
- Marketplace must depend on payment; payment never depends on marketplace

---

## Earlier Checkpoints

| Tag | Description |
|-----|-------------|
| `development-checkpoint-phase4` | Pre-orders baseline |
| `development-checkpoint-phase3` | Pre-catalog baseline |
| `payment-foundation-v1` | Early payment foundation snapshot |
| `v1.0-production-baseline` | Initial production baseline |
