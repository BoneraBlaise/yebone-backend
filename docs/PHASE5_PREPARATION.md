# Phase 5 — Orders Preparation

**Do not implement.** Preparation summary only.

**Baseline:** `development-checkpoint-phase4` / `product-catalog-v1`  
**Branch to use:** `feature/product-catalog` (or new `feature/orders` from checkpoint tag)

---

## Existing Order Modules

Yebone already has a working order system across legacy v2 API, Marketplace Core hooks, and frontend Redux — not yet a canonical orders platform layer.

### Backend — built today

| Area | Location | Coverage |
|------|----------|----------|
| Order model | `model/order.js` | Cart, shipping, payment info, status, referral, order types |
| Order routes | `controller/order.js` | 7 endpoints at `/api/v2/order` |
| Order create service | `marketplace/services/OrderService.js` | **Create only** (regular + won bid) |
| Payment hook | `marketplace/hooks/PaymentIntegrationHook.js` | `paymentSessions` on create |
| Order lifecycle hook | `marketplace/hooks/OrderLifecycleHook.js` | Post-create stub |
| Commission utils | `utils/referralUtils.js` | Referral commission on order create/delivery |

### OrderService status

**Implemented in OrderService:**

- `createOrders()` — cart grouping by shop, won bid orders, referral commission processing
- Validation for shipping address, user, payment info, cart

**Still in controller/order.js:**

- `GET /get-all-orders/:userId`
- `GET /get-seller-all-orders/:shopId`
- `PUT /update-order-status/:id` — seller status, inventory updates, commission payout, balance update
- `PUT /order-refund/:id` — customer refund request
- `PUT /order-refund-success/:id` — seller refund acceptance + stock restore
- `GET /admin-all-orders`

### Routes (preserve unchanged)

| Method | Route | Auth |
|--------|-------|------|
| POST | `/create-order` | Public (body carries user) |
| GET | `/get-all-orders/:userId` | Public |
| GET | `/get-seller-all-orders/:shopId` | Public |
| PUT | `/update-order-status/:id` | Seller |
| PUT | `/order-refund/:id` | Authenticated user |
| PUT | `/order-refund-success/:id` | Seller |
| GET | `/admin-all-orders` | Admin |

Mounted at: `app.use("/api/v2/order", order)`

---

## Controllers

- **`controller/order.js`** — primary target for extraction; create already delegates to `getMarketplaceCore().services.order`
- **`controller/payment.js`** — legacy v2 payment routes (separate from frozen `payments/`)
- No `marketplace/orders/` layer exists yet

---

## Models

- **`model/order.js`** — Order schema with cart array validation, status defaults, referral code
- Related: `model/shop.js` (seller balance updates), `model/product.js` (stock on delivery/refund), `model/commission.js`

---

## Business Logic (complex areas)

| Flow | Location | Notes |
|------|----------|-------|
| Order create | `OrderService.createOrders` | Multi-shop cart split, payment hook wired |
| Status update | Controller inline | Service charge 10%, commission paid on Delivered |
| Inventory mutation | Controller inline | Stock/sold_out on delivery and refund |
| Seller balance | Controller inline | Direct `Shop.availableBalance` update |
| Refund request/accept | Controller inline | Status changes + stock restore |
| Referral commission | `referralUtils` + controller | Pending → available on delivery |

---

## Frontend — production baseline

| Area | Location |
|------|----------|
| Order Redux | `src/redux/actions/order.js`, `src/redux/reducers/order.js` |
| Customer | `CheckoutPage`, `PaymentPage`, `OrderSuccessPage`, `OrderDetailsPage`, `TrackOrderPage` |
| Seller | `ShopAllOrders.jsx`, `ShopOrderDetails.jsx`, `ShopAllRefunds.jsx` |
| Admin | `AdminDashboardOrders.jsx` |
| Payment UI | `src/components/Payment/Payment.jsx` |

API calls: `/order/create-order`, `/order/get-all-orders/:userId`, `/order/get-seller-all-orders/:shopId`, `/order/admin-all-orders`

---

## Files to Reuse

- `model/order.js` — no rewrite
- `controller/order.js` — thin HTTP layer after extraction
- `marketplace/services/OrderService.js` — extend, don't replace
- `marketplace/hooks/PaymentIntegrationHook.js` — frozen integration path
- `marketplace/hooks/OrderLifecycleHook.js` — extend for order platform hooks
- `utils/referralUtils.js`, `utils/calculateCommission.js`
- Legacy checkout, payment, and order UI pages
- Redux order state and actions

---

## Files to Upgrade

- `OrderService` — list, status update, refund, admin list, inventory side effects
- `controller/order.js` — delegate all handlers; remove inline model logic
- New `marketplace/orders/` platform (mirroring vendor/catalog pattern)
- Consistent error handling and seller ownership validation on status updates
- Reduce direct `Shop.availableBalance` mutations where payment facade applies

---

## Known Issues (from audit and current code)

- Order create integrated with payment hooks; other flows are not service-extracted
- Status update handler mixes commission, inventory, and balance logic inline
- `update-order-status` uses nested async functions with potential race patterns
- Seller balance set (not incremented) on delivery — legacy behavior to preserve or document
- No canonical orders health endpoint or feature registry
- Checkout/cart UX not unified with v1 payment checkout
- Delivery status string `"Transferred to delivery partner"` is hardcoded — delivery phase deferred
- Frontend order pages may not fully follow `FRONTEND_ARCHITECTURE.md` responsive standards yet

---

## Modules to Freeze (after Phase 5)

- `marketplace/orders/` (or equivalent canonical layer)
- Extended `OrderService`
- Tag target: `orders-v1`

**Must remain frozen during Phase 5:**

- `payments/`
- `marketplace/core/`
- `marketplace/vendor/`
- `marketplace/catalog/`

---

## Phase 5 Entry Checklist

1. Branch from `development-checkpoint-phase4`
2. Read `docs/FRONTEND_ARCHITECTURE.md` before any UI changes
3. Do not modify frozen module directories
4. Extend `OrderService` before adding parallel order implementations
5. Preserve all `/api/v2/order/*` route paths and payment session response shape
6. Run full verification suite including new `test:orders` when added
7. Freeze with tag `orders-v1` — do not begin Phase 6
