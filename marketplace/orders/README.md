# Orders Platform v1.1 (Production Hardening)

Baseline: `orders-v1`  
Production tag: `orders-production-v1`

Health: `GET /api/v2/marketplace/orders/health`

Order business logic lives in `marketplace/services/OrderService.js`.  
Order orchestration lives in `marketplace/orders/`.

Legacy order routes remain at `/api/v2/order/*` for API compatibility.

Production safeguards: see [PRODUCTION.md](./PRODUCTION.md).

Do not modify `payments/`, `marketplace/core/`, `marketplace/vendor/`, or `marketplace/catalog/`.
