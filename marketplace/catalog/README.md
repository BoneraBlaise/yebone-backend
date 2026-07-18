# Product Catalog v1

Baseline: `development-checkpoint-phase3` (frozen Marketplace Core + Vendor Platform)

Health: `GET /api/v2/marketplace/catalog/health`

Product business logic lives in `marketplace/services/ProductService.js`.
Catalog orchestration lives in `marketplace/catalog/`.

Legacy product routes remain at `/api/v2/product/*` for API compatibility.

Do not modify `payments/`, `marketplace/core/`, or `marketplace/vendor/`.
