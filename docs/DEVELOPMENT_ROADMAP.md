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
- Extract order, product create, and commission business logic
- Payment integration hooks (marketplace → payment only)
- Freeze at `marketplace-core-v1`

---

## Phase 3 — Vendor Management ✅

- Complete ShopService integration
- Canonical vendor platform (profile, verification, settings, analytics)
- Upgrade legacy shop controller without breaking APIs
- Freeze at `vendor-management-v1`

---

## Phase 4 — Product Catalog (Next)

- Formalize product catalog as a canonical layer
- Extract remaining product controller logic into ProductService
- Preserve existing product APIs and seller/customer flows
- Integrate with Marketplace Core and Vendor Platform
- Freeze at `product-catalog-v1`

---

## Phase 5 — Search & Discovery

- Unified product and shop search
- Category-aware discovery
- Replace ad-hoc frontend filtering with backend search APIs

---

## Phase 6 — Notifications

- Order, seller, and customer notification pipeline
- Email and in-app notification foundation
- Admin and seller alert workflows

---

## Phase 7 — Inventory & Categories

- Inventory tracking redesign
- Category taxonomy modernization
- Stock management aligned with catalog layer

---

## Phase 8 — Delivery & Fulfillment

- Shipping and delivery workflow
- Order fulfillment status pipeline
- Seller and customer delivery visibility

---

## Phase 9 — YEBO AI

- AI hooks activation across marketplace, vendor, and catalog
- Product knowledge and seller assistance
- Customer discovery and recommendations

---

## Phase 10 — Mobile App

- Mobile client on shared API contracts
- Seller and customer mobile experiences
- Push notifications and offline-ready flows
