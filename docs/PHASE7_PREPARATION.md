# Phase 7 Preparation — YEBO AI

Baseline: `search-production-v1`  
Do not begin Phase 7 until this checkpoint is tagged and frozen.

---

## What YEBO AI Can Reuse

| Asset | Location | Use in Phase 7 |
|-------|----------|----------------|
| Search query engine | `SearchService` | All product/shop discovery queries |
| Search orchestration | `SearchPlatform` | AI query routing and response shaping |
| Filter builder | `SearchFilters` + `ProductSearch.prepareFilters()` | Structured filter extraction from NL queries |
| Text normalization | `SearchTextNormalizer` | Safe keyword handling before AI enrichment |
| Suggestions API | `GET /api/v2/search/suggestions` | Typeahead and AI-assisted discovery UI |
| Search hooks | `SearchHooks.afterProductSearch()` | Post-query analytics and AI context |
| Health probe | `GET /api/v2/marketplace/search/health` | AI service readiness checks |
| Frontend search UI | `/search`, `ProductsPage`, `useProductSearch` | Wire AI overlays without new layouts |
| Frontend architecture | `docs/FRONTEND_ARCHITECTURE.md` | All AI UI must comply |

---

## What YEBO AI Must Never Duplicate

- MongoDB product/shop query execution (use `SearchService` only)
- Filter building logic (`SearchFilters`)
- Sort/ranking whitelist (`SearchRanking`)
- Query validation and NoSQL injection guards (`SearchValidation`)
- Pagination metadata construction
- Legacy route compatibility (`SearchCompatibility.hasSearchQuery`)
- Parallel search result page layouts (extend `ProductsPage` / `SearchPage`)

---

## Integration Pattern for Phase 7

1. AI receives natural language query from frontend (`src/components/ai/`)
2. AI orchestration maps intent → structured search params
3. AI calls `SearchPlatform.searchProducts(structuredParams)` — **not** direct Mongo access
4. AI enriches results (summaries, explanations) without replacing search execution
5. Frontend displays enriched results in existing `ProductsPage` shell

---

## Prerequisites Verified at `search-production-v1`

- [x] Single `SearchService` query engine
- [x] Production validation and rate limiting
- [x] Unicode and regex-safe keyword normalization
- [x] Stable pagination metadata
- [x] Frontend architecture frozen (`FRONTEND_ARCHITECTURE.md`)
- [x] Server-backed search with retry and state views
- [x] All verification tests passing

---

## Out of Scope for Phase 7 Prep

- Vector / semantic search indexes
- Personalization engine
- Voice search
- Recommendation models

These require explicit Phase 7 design after YEBO AI orchestration is defined.
