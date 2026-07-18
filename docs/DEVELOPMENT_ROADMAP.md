# Yebone — Development Roadmap

Objectives only. No implementation details.

---

## Phase 1 — Payment Module ✅

- Establish provider-independent payment foundation
- Freeze at `payment-foundation-v10`

---

## Phase 2 — Marketplace Core ✅

- Canonical marketplace layer
- Freeze at `marketplace-core-v1`

---

## Phase 3 — Vendor Management ✅

- ShopService + vendor platform
- Freeze at `vendor-management-v1`

---

## Phase 4 — Product Catalog ✅

- ProductService + catalog platform
- Freeze at `product-catalog-v1`

---

## Phase 5 — Orders ✅

- OrderService + orders platform
- Production hardening at `orders-production-v1`

---

## Phase 6 — Search & Discovery ✅

- SearchService + search platform
- Server-backed discovery APIs
- Frontend search UI with pagination and filters
- Production hardening at `search-production-v1`

---

## Phase 7 — YEBO AI (Next)

- Natural language discovery via SearchPlatform (no duplicate query engine)
- AI orchestration hooks on frozen search and orders layers
- Frontend AI components wire to existing `/search` and `/products` shells
- See `docs/PHASE7_PREPARATION.md`

---

## Phase 8 — Inventory & Categories

- Category taxonomy modernization
- Inventory tracking redesign

---

## Phase 9 — Delivery & Fulfillment

- Shipping workflow and fulfillment pipeline

---

## Phase 10 — Notifications & Mobile

- Notification pipeline
- Mobile client on shared API contracts
