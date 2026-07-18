# Yebone Search Platform

Baseline: `search-v1`  
Production tag: `search-production-v1`

## Overview

The Search platform provides backend discovery for products, shops, categories, and suggestions. It reuses `ProductSearch.prepareFilters()` from the frozen Product Catalog module.

## Architecture

```
GET /api/v2/search/*
    ↓
SearchPlatform (orchestration)
    ├── SearchValidation
    ├── SearchQuery + SearchTextNormalizer
    ├── SearchFilters (extends ProductSearch)
    ├── SearchRanking
    └── SearchService (single query engine)
```

Health: `GET /api/v2/marketplace/search/health`

## Public Routes

| Route | Purpose |
|-------|---------|
| `GET /api/v2/search/products` | Product search with filters, sort, pagination |
| `GET /api/v2/search/shops` | Shop search |
| `GET /api/v2/search/categories` | Distinct product categories |
| `GET /api/v2/search/suggestions` | Typeahead suggestions |

Legacy compatibility: `GET /api/v2/product/get-all-products?search=...` delegates to SearchPlatform.

## Supported Filters

Keyword, category, shop, price range, rating, availability, featured, best deal, discounted, product type, condition, location, brand.

## Sort Options

`newest`, `popular`, `featured`, `priceLowToHigh`, `priceHighToLow`, `rating`, `bestSelling`, `almostGone`

## Production Hardening

See `marketplace/search/PRODUCTION.md` and `marketplace/search/INDEXES.md`.

## Tests

```bash
npm run test:search-production
npm run verify:search-production
```

## Frozen After Production Tag

Do not modify `marketplace/search/` or `SearchService` without explicit unfreeze. Phase 7 (YEBO AI) must consume this platform — not duplicate it.
