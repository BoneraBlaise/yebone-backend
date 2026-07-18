# YEBO AI Integration Guide

**Checkpoint:** `platform-pre-ai-v1`  
**Prerequisite tags:** All foundation tags through `search-production-v1`

YEBO AI must **orchestrate** frozen platform modules. It must **never duplicate** business logic or bypass service layers.

Related: [PLATFORM_ARCHITECTURE.md](./PLATFORM_ARCHITECTURE.md) · [PHASE7_PREPARATION.md](./PHASE7_PREPARATION.md)

---

## Integration Principles

1. AI receives natural language or structured intent from the frontend (`src/components/ai/`)
2. AI maps intent to **platform API calls** or **platform method invocations**
3. AI enriches responses (summaries, explanations) — it does not replace query engines
4. All persistence goes through existing Services
5. Frontend displays results in frozen shells (`ProductsPage`, `/search`, dashboards)

---

## SearchPlatform — Primary AI Discovery Interface

### May use

| Interface | Purpose |
|-----------|---------|
| `SearchPlatform.searchProducts(query)` | Product discovery |
| `SearchPlatform.searchShops(query)` | Shop discovery |
| `SearchPlatform.suggest(query)` | Typeahead / NL disambiguation |
| `SearchPlatform.listCategories()` | Category context |
| `GET /api/v2/search/products` | HTTP equivalent |
| `GET /api/v2/search/suggestions` | HTTP typeahead |
| `SearchHooks.afterProductSearch()` | Post-query analytics context |

### Must never bypass

- `SearchService` (Mongo execution)
- `SearchFilters` / `SearchRanking` / `SearchValidation`
- Direct `Product.find()` from AI code

### Pattern

```
NL query → AI intent parser → structured { q, category, sort, ... }
  → SearchPlatform.searchProducts(structured)
  → AI enriches product list with explanations
  → Frontend renders in ProductsPage shell
```

---

## Product Catalog — Read Context Only

### May use

| Interface | Purpose |
|-----------|---------|
| `ProductPlatform.catalog.getById()` | Product detail context |
| `ProductPlatform.catalog.listByShop()` | Shop catalog context |
| `GET /api/v2/product/get-all-products-shop/:id` | HTTP equivalent |
| `ProductCategories.normalize()` | Category string normalization |

### Must never bypass

- `ProductService` for mutations (AI does not create products directly)
- `ProductPlatform.createProduct()` without human seller authorization flow

### Must never duplicate

- Product validation rules (`ProductValidation`)
- Pricing/inventory validation (`ProductPricing`, `ProductInventory`)

---

## Vendor Platform — Seller Context

### May use

| Interface | Purpose |
|-----------|---------|
| `VendorPlatform` shop lookup via `ShopService.findById()` | Seller context for AI responses |
| `GET /api/v2/shop/*` read routes | HTTP shop data |

### Must never bypass

- `ShopService` business rules for registration/updates
- Seller auth middleware for protected operations

---

## Orders Platform — Status and Assistance

### May use

| Interface | Purpose |
|-----------|---------|
| `OrderPlatform` read via `OrderService.findById()` | Order status for AI assistant |
| `OrderHistory.listForUser()` | Customer order context |
| `OrderStatus.getSummary()` | Status metadata |
| `GET /api/v2/order/get-all-orders/:userId` | HTTP (authenticated) |

### Must never bypass

- `OrderService` for create/update/refund mutations
- `OrderStateMachine` for status transitions
- `OrderInventoryService` for stock operations
- Idempotency layer on order create

### Must never duplicate

- Order state machine logic
- Inventory reservation
- Payment session creation (use `PaymentIntegrationHook`)

---

## Payment Foundation — Financial Operations

### May use

| Interface | Purpose |
|-----------|---------|
| `PaymentIntegrationHook.prepareForOrders()` | Payment session coordination |
| Legacy facade via `delegateToFacade()` | Only through existing hooks |
| Payment health / readiness probes | Operational checks |

### Must never bypass

- Payment facade for any charge/refund operation
- Direct provider SDK calls
- Ledger write paths outside payment module

---

## Frontend Integration

| Asset | AI use |
|-------|--------|
| `src/components/ai/` | AI UI overlays |
| `ProductsPage` / `SearchPage` | Result display shell |
| `useProductSearch` | URL-synced server search |
| `docs/FRONTEND_ARCHITECTURE.md` | Mandatory UI compliance |

AI UI supplements pages — does not replace them.

---

## Interfaces AI Must Never Bypass

| Layer | Reason |
|-------|--------|
| All `*Service` classes | Business logic ownership |
| `OrderStateMachine` | Prevents invalid order states |
| `SearchValidation` | Prevents injection attacks |
| `OrderIdempotencyService` | Prevents duplicate orders |
| Payment facade | Financial integrity |
| MongoDB models from AI code | Bypasses validation and hooks |

---

## Hooks for AI Extension (Future)

| Hook | Module | Extension point |
|------|--------|-----------------|
| `SearchHooks.afterProductSearch` | Search | AI context logging |
| `SearchHooks.afterSuggestions` | Search | NL intent tracking |
| `OrderHooks.afterCreate` | Orders | Post-order AI actions |
| `AiHookRegistry` | Marketplace Core | Registered AI callbacks |
| `SearchConfiguration.aiSearchReady` | Search | Feature flag |

Extend via hooks — do not fork platform code.

---

## Verification Before AI Development

```bash
npm run verify:platform-pre-ai
```

All tests must pass. Platform must remain frozen except AI orchestration layer (new code outside frozen modules).

---

## Phase 7 Scope Boundary

**In scope:** NL → structured search, AI response enrichment, assistant UI wiring

**Out of scope (defer):** Vector indexes, personalization engine, voice search, recommendation ML, autonomous order/payment mutations without user confirmation
