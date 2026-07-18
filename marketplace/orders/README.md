# Orders Platform v1

Baseline: `development-checkpoint-phase4` (frozen Marketplace Core, Vendor, Catalog)

Health: `GET /api/v2/marketplace/orders/health`

Order business logic lives in `marketplace/services/OrderService.js`.
Order orchestration lives in `marketplace/orders/`.

Legacy order routes remain at `/api/v2/order/*` for API compatibility.

Do not modify `payments/`, `marketplace/core/`, `marketplace/vendor/`, or `marketplace/catalog/`.
