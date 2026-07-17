# Vendor Platform v1

Baseline: `marketplace-core-v1` (frozen Marketplace Core)

Health: `GET /api/v2/marketplace/vendor/health`

Shop business logic lives in `marketplace/services/ShopService.js`.
Vendor orchestration lives in `marketplace/vendor/`.

Legacy shop routes remain at `/api/v2/shop/*` for API compatibility.

Payment and withdraw payout orchestration stays in `payments/` — vendor layer only manages shop profile and withdraw method fields.
