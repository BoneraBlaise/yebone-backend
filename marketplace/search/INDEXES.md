# Search Indexes (Recommended)

Apply these indexes in production for Phase 6 search performance:

## Products

```javascript
db.products.createIndex({ name: 1 });
db.products.createIndex({ category: 1, createdAt: -1 });
db.products.createIndex({ shopId: 1, createdAt: -1 });
db.products.createIndex({ discountPrice: 1 });
db.products.createIndex({ ratings: -1 });
db.products.createIndex({ sold_out: -1 });
db.products.createIndex({ featured: -1, createdAt: -1 });
db.products.createIndex({ stock: 1 });
```

## Shops

```javascript
db.shops.createIndex({ name: 1 });
```

`SearchService.ensureRecommendedIndexes()` can create these in maintenance scripts or integration tests.

Query patterns optimized:

- Keyword regex on `name`, `description`, `tags`, `category`
- Category + sort by `createdAt`
- Price range on `discountPrice`
- Availability on `stock`
- Popularity on `sold_out`

Future AI search (Phase 7) may add vector indexes without changing public search routes.
