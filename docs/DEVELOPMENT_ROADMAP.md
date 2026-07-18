# Yebone — Development Roadmap

**Checkpoint:** `platform-pre-ai-v1`  
**Foundation status:** COMPLETE — frozen until Phase 7 begins

Related: [PROJECT_STATUS.md](./PROJECT_STATUS.md) · [PLATFORM_ARCHITECTURE.md](./PLATFORM_ARCHITECTURE.md) · [CHANGELOG.md](../CHANGELOG.md)

---

## Completed ✅

### Phase 1 — Payment Module

- Provider-independent payment foundation
- **Tag:** `payment-foundation-v10`

### Phase 2 — Marketplace Core

- Canonical marketplace composition layer
- **Tag:** `marketplace-core-v1`

### Phase 3 — Vendor Management

- ShopService + vendor platform
- **Tag:** `vendor-management-v1`

### Phase 4 — Product Catalog

- ProductService + catalog platform
- **Tag:** `product-catalog-v1`

### Phase 5 — Orders

- OrderService + orders platform
- Production hardening: idempotency, transactions, inventory guards
- **Tags:** `orders-v1` → `orders-production-v1`

### Phase 6 — Search & Discovery

- SearchService + search platform
- Server-backed discovery APIs, frontend search UI
- Production hardening: validation, rate limits, unicode normalization
- **Tags:** `search-v1` → `search-production-v1`

### Platform Freeze Checkpoint

- Canonical architecture documentation
- Full verification suite
- Pre-AI release notes and AI integration guide
- **Tag:** `platform-pre-ai-v1`

---

## Current

**Platform foundation is frozen.** No active development phase.

Restore point: `platform-pre-ai-v1`  
Branch: `feature/platform-freeze-checkpoint`

---

## Upcoming

### Phase 7 — YEBO AI

- Natural language discovery via SearchPlatform (no duplicate query engine)
- AI orchestration hooks on frozen search and orders layers
- Frontend AI components wire to existing `/search` and `/products` shells
- **Guide:** [YEBO_AI_INTEGRATION_GUIDE.md](./YEBO_AI_INTEGRATION_GUIDE.md)
- **Prerequisite:** Deploy and freeze `platform-pre-ai-v1`

---

## Future

### Phase 8 — Inventory & Categories

- Category taxonomy modernization
- Inventory tracking redesign

### Phase 9 — Delivery & Fulfillment

- Shipping workflow and fulfillment pipeline

### Phase 10 — Notifications & Mobile

- Notification pipeline
- Mobile client on shared API contracts

---

## Archive (Obsolete Entries)

The following items were superseded by foundation completion and are no longer active roadmap targets:

| Obsolete Entry | Superseded By |
|----------------|---------------|
| "Implement order service from scratch" | `orders-v1` / `orders-production-v1` |
| "Build search from Product.find()" | `search-v1` / `search-production-v1` |
| "Migrate payment logic to controllers" | `payment-foundation-v10` facade |
| "Phase 6 prep only" docs | `platform-pre-ai-v1` checkpoint |

Historical phase prep documents (`PHASE4_PREPARATION.md`, `PHASE5_PREPARATION.md`, `PHASE7_PREPARATION.md`) remain for context; canonical Phase 7 guidance is [YEBO_AI_INTEGRATION_GUIDE.md](./YEBO_AI_INTEGRATION_GUIDE.md).
