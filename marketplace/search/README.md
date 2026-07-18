# Search Platform v1.1 (Production)

Baseline: `search-v1`  
Production tag: `search-production-v1`

Health: `GET /api/v2/marketplace/search/health`

Search business logic lives in `marketplace/services/SearchService.js`.  
Search orchestration lives in `marketplace/search/`.

Legacy-compatible routes:

- `GET /api/v2/search/products`
- `GET /api/v2/search/shops`
- `GET /api/v2/search/categories`
- `GET /api/v2/search/suggestions`

`GET /api/v2/product/get-all-products` accepts optional search query params and delegates to SearchPlatform while preserving `{ success, products }`.

Reuses `marketplace/catalog/ProductSearch.prepareFilters()` via `SearchFilters`.

Recommended MongoDB indexes: see `INDEXES.md`.

Do not modify frozen modules: `payments/`, `marketplace/core/`, `marketplace/vendor/`, `marketplace/catalog/`, `marketplace/orders/`.

Future AI semantic search hooks are prepared in `SearchHooks` and `SearchConfiguration.aiSearchReady`.
