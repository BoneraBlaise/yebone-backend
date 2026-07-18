# Search Platform — Production Hardening v1.1

Baseline: `search-v1`  
Production tag: `search-production-v1`

## Quality Improvements

- Unicode normalization (`NFKC`) on all text inputs
- Whitespace collapse and duplicate token removal for keywords
- Centralized regex escaping via `SearchTextNormalizer`
- Stable pagination caps (`maxPage`, `maxLimit`)
- Rating filter bounds (0–5)
- Product type whitelist validation
- Sort whitelist via `SearchRanking`
- Legacy query detection centralized in `SearchCompatibility`

## Security

- Blocks Mongo operators in query strings (`$where`, `$regex`, nested objects)
- Maximum query value length (500 chars raw input)
- Rate limiting on search mutation endpoints
- No user-controlled sort field names

## Performance

- Lean queries with explicit projection
- Parallel `find` + `countDocuments`
- Recommended indexes in `INDEXES.md`
- No N+1 patterns in search execution path

## Architecture Rules

| Rule | Enforcement |
|------|-------------|
| Single query engine | `SearchService` only executes Mongo queries |
| Thin controllers | `controller/search.js` delegates to `SearchPlatform` |
| No duplicated filters | `SearchFilters` wraps `ProductSearch.prepareFilters()` |
| No duplicated ranking | `SearchRanking` only |
| No duplicated validation | `SearchValidation.assertNormalizedQuery()` |

## YEBO AI Readiness

Phase 7 must consume:

- `SearchPlatform.searchProducts()`
- `SearchPlatform.suggest()`
- `SearchHooks.afterProductSearch()`

Phase 7 must **not** duplicate filter building, ranking, or Mongo query execution.

## Tests

```bash
npm run test:search-production
npm run verify:search-production
```
