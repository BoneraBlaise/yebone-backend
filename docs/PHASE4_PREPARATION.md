# Phase 4 — Product Catalog Preparation

**Do not implement.** Preparation summary only.

**Baseline:** `vendor-management-v1`  
**Branch to use tomorrow:** `feature/vendor-management` (or new `feature/product-catalog` from tag)

---

## Existing Product Catalog

Yebone already has a working product system spread across legacy v2 API and frontend Redux — not yet a canonical catalog layer.

### Backend — built today

| Area | Location | Coverage |
|------|----------|----------|
| Product model | `model/product.js` | Full schema (images, reviews, likes, stock, shop link) |
| Product routes | `controller/product.js` | 8 endpoints mounted at `/api/v2/product` |
| Product create service | `marketplace/services/ProductService.js` | **Create only** — delegates from controller |
| Upload helper | `marketplace/services/UploadService.js` | Shared Cloudinary uploads |
| Shop validation | `ShopService.findById` | Used indirectly on create |

### Backend — routes still in controller

- `GET /get-all-products-shop/:id`
- `DELETE /delete-shop-product/:id`
- `GET /get-all-products`
- `PUT /create-new-review`
- `PUT /like-product`
- `GET /admin-all-products`

### Frontend — production baseline (legacy App.js)

| Area | Location |
|------|----------|
| Product Redux | `src/redux/actions/product.js`, `src/redux/reducers/product.js` |
| Customer pages | `ProductsPage.jsx`, `ProductDetailsPage.jsx` |
| Product components | `src/components/Products/*`, `src/components/Route/ProductCard/*` |
| Seller product UI | `ShopCreateProduct.jsx`, `ShopAllProducts.jsx`, `CreateProduct.jsx`, `AllProducts.jsx` |

### Parallel stacks — do not wire

- `src/vendor-ui/components/products/ProductManagement.jsx` — mock, unwired
- `src/customer-ui/components/products/ProductDiscovery.jsx` — unwired

---

## Files Involved (Phase 4 scope)

### Backend (primary)

- `controller/product.js`
- `model/product.js`
- `marketplace/services/ProductService.js`
- `marketplace/services/UploadService.js`
- `marketplace/services/ShopService.js` (shop ownership checks)
- `marketplace/index.js` (registration only — do not modify `marketplace/core/`)

### Frontend (secondary, P0 fixes already applied)

- `src/redux/actions/product.js`
- `src/redux/reducers/product.js`
- `src/components/Shop/CreateProduct.jsx`, `AllProducts.jsx`
- `src/components/Products/ProductDetails.jsx`
- `src/pages/ProductsPage.jsx`, `ProductDetailsPage.jsx`

---

## Modules Already Built

- Product Mongoose model with reviews, likes, stock, images
- Full CRUD-ish API surface (create delegated; rest in controller)
- Cloudinary image pipeline via UploadService
- Seller product dashboard (legacy UI)
- Customer product listing and detail pages
- Admin all-products endpoint
- Product create Redux action (P0 payload bug fixed in Phase 2 frontend commit)

---

## Modules to Reuse

- `model/product.js` — no rewrite
- `controller/product.js` — thin HTTP layer after extraction
- `marketplace/services/ProductService.js` — extend, don't replace
- `marketplace/services/UploadService.js`
- `marketplace/services/ShopService.js` — store ownership validation
- Legacy seller and customer product UI
- Redux product state and actions
- Design system product cards and detail components

---

## Modules to Upgrade

- `ProductService` — list, delete, review, like, admin list, update (if added)
- `controller/product.js` — delegate all handlers to ProductService / catalog layer
- New `marketplace/catalog/` layer (mirroring vendor pattern) — optional composition root
- Error handling and validation consistency across product endpoints
- Remove debug `console.log` calls in product delete/like handlers

---

## Modules to Freeze (after Phase 4)

- `marketplace/catalog/` (or equivalent canonical layer)
- Extended `ProductService`
- Tag target: `product-catalog-v1`

**Must remain frozen during Phase 4:**

- `payments/`
- `marketplace/core/`
- `marketplace/vendor/`

---

## Known Issues from Marketplace Readiness Audit

### Product-specific

- Product create was broken in Redux (fixed frontend Phase 2); backend create already delegates to ProductService
- Most product business logic still lives in `controller/product.js` — inconsistent with order/vendor extraction pattern
- No canonical catalog layer, health endpoint, or feature registry for products
- Product delete mixes Cloudinary cleanup inline in controller

### Broader context affecting catalog work

- Marketplace API rated monolithic (upgrade, don't rewrite)
- ~86 v2 routes with uneven service extraction
- Dual frontend UI stacks exist but are unwired — do not mount parallel product UIs
- Search deferred — product listing uses client-side/category filtering today
- Inventory and categories redesign explicitly deferred beyond catalog formalization
- PayLater product modules deprecated and unmounted

### Architecture verifier warnings (unchanged)

- Duplicate `TransactionRepository` class in payment infrastructure (not catalog-blocking)
- Architecture score: 62 (stable, non-regressing)

---

## Phase 4 Entry Checklist (Tomorrow)

1. Branch from `vendor-management-v1` or continue `feature/vendor-management`
2. Do not modify `payments/`, `marketplace/core/`, `marketplace/vendor/`
3. Extend `ProductService` before adding parallel catalog code paths
4. Preserve all `/api/v2/product/*` route paths
5. Run `test:marketplace-core`, `test:vendor-management`, `test:payment-foundation`, `verify:architecture`, `verify:legacy-migration`
6. Freeze with tag `product-catalog-v1` — do not begin Phase 5
