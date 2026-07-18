# Yebone — Development Roadmap

Objectives only. No implementation details.

---

## Phase 1 — Payment Module ✅

- Establish provider-independent payment foundation
- Ledger, idempotency, webhooks, and transaction correlation
- Legacy payment adapter bridge for v2 marketplace
- Freeze at `payment-foundation-v10`

---

## Phase 2 — Marketplace Core ✅

- Canonical marketplace layer (config, lifecycle, health, hooks)
- Extract order create, product create, and commission business logic
- Payment integration hooks (marketplace → payment only)
- Freeze at `marketplace-core-v1`

---

## Phase 3 — Vendor Management ✅

- Complete ShopService integration
- Canonical vendor platform (profile, verification, settings, analytics)
- Upgrade legacy shop controller without breaking APIs
- Freeze at `vendor-management-v1`

---

## Phase 4 — Product Catalog ✅

- Expand ProductService as single product business layer
- Canonical product catalog platform (lifecycle, validation, media, pricing)
- Upgrade legacy product controller without breaking APIs
- Freeze at `product-catalog-v1`

---

## Phase 5 — Orders (Next)

- Expand OrderService as single order business layer
- Canonical orders platform (lifecycle, status, refunds, fulfillment hooks)
- Preserve payment session integration and legacy order APIs
- Integrate with Marketplace Core, Vendor Platform, and Product Catalog
- Freeze at `orders-v1`

---

## Phase 6 — Search & Discovery

- Unified product and shop search
- Category-aware discovery
- Replace ad-hoc frontend filtering with backend search APIs

---

## Phase 7 — Notifications

- Order, seller, and customer notification pipeline
- Email and in-app notification foundation
- Admin and seller alert workflows

---

## Phase 8 — Inventory & Categories

- Inventory tracking redesign beyond catalog fields
- Category taxonomy modernization
- Stock management aligned with orders and catalog

---

## Phase 9 — Delivery & Fulfillment

- Shipping and delivery workflow
- Order fulfillment status pipeline
- Seller and customer delivery visibility

---

## Phase 10 — YEBO AI & Mobile

- AI hooks activation across marketplace layers
- Product knowledge, seller assistance, and customer discovery
- Mobile client on shared API contracts with responsive web parity
