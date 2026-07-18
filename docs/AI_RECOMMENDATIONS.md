# YEBO AI — Contextual Recommendations

**Tag:** `yebo-ai-recommend-v1`  
**Baseline:** `yebo-ai-assistant-v1`  
**Status:** IMPLEMENTED (Phase 7.5)

Related: [YEBO_AI_ARCHITECTURE.md](./YEBO_AI_ARCHITECTURE.md) · [AI_TOOLS.md](./AI_TOOLS.md) · [AI_ASSISTANT.md](./AI_ASSISTANT.md)

---

## Objective

Enable YEBO AI to generate **deterministic, explainable** product recommendations from existing platform data and current tool results — without ML, embeddings, personalization, or persistent memory.

---

## Architecture

```
User message
    ↓
ConversationFlowAnalyzer (recommendation intent)
    ↓
AIPlanner → recommend.contextual
    ↓
RecommendationTool
    ├─ reuse session SearchTool products (preferred)
    ├─ optional CatalogTool enrichment
    └─ RecommendationEngine.rank()
    ↓
MockProvider explains RecommendationTool reasons
    ↓
Gateway response { recommendations[], message }
```

---

## RecommendationEngine

**Path:** `marketplace/ai/recommendations/RecommendationEngine.js`

Deterministic rule evaluation only:

| Signal | Source | Rule |
|--------|--------|------|
| Availability | `stock`, `quantity`, `inStock` | Prefer in-stock items |
| Price | `discountPrice`, `price` | Prefer budget-fit / affordable ordering |
| Rating | `averageRating`, `rating` | Prefer higher exposed ratings |
| Popularity | `featured`, `salesCount`, `views` | Prefer featured / higher counts |
| Completeness | name, price, images, description | Prefer complete listings |

**Never invents scores.** Each recommendation includes a transparent `reasons[]` array.

---

## RecommendationTool

**ID:** `recommend.contextual`  
**Version:** `7.5.0`

### Input

```javascript
{
  action: "rank",
  message: "Which one do you recommend?",
  sourceProducts: [],        // optional — session products preferred
  searchRequest: { ... },    // optional — reused from session
  preferAffordable: true,
  limit: 5
}
```

### Output

```javascript
{
  recommendations: [
    {
      rank: 1,
      product: { ... },
      searchPreview: { id, name, discountPrice, images },
      reasons: ["Available in stock", "Listed at RWF 45000"],
      signals: { inStock: true, price: 45000, ... }
    }
  ],
  meta: {
    engine: "RecommendationEngine",
    rulesApplied: ["availability", "price"],
    searchReused: true,
    searchExecuted: false
  }
}
```

---

## Planner Routing

`ConversationFlowAnalyzer` detects recommendation intent:

- “What do you recommend?”
- “Best option?”
- “Which one should I buy?”
- “Which is better?”

Flow type: `recommendation_request` → intent `recommend` → tool `recommend.contextual`.

When session already has search results, RecommendationTool **reuses** them instead of executing SearchTool again.

---

## MockProvider

MockProvider reads `toolResults[].data.recommendations` and explains the top pick using **only** RecommendationTool reasons — never inventing product attributes.

---

## Observability

`AIMetrics` tracks:

- `recommendationRequests`
- `recommendationGenerations`
- `recommendationReuseCount`
- `averageRecommendationLatencyMs`
- `recommendationReasons` (reason string counts)

---

## Frontend (minimal)

No UI redesign. Existing conversation UI renders recommendation cards when gateway returns `recommendations[]`:

- `GatewayAssistantAdapter` maps gateway payload
- `YIPProvider.sendMessage` attaches `recommendations` to assistant messages
- `AIResponseCard` reuses `YEBOSmartSearchResults`

---

## Verification

```bash
npm run test:ai-recommend
npm run verify:yebo-ai-recommend
```

---

## Out of Scope (Phase 7.5)

- Persistent conversation memory
- User profile personalization
- ML / embeddings / vector search
- Live LLM providers
- Checkout intelligence
- Ranking engine rewrite
- Collaborative filtering

**Next milestone:** Phase 7.6 Checkout Intelligence (`yebo-ai-checkout-v1`)
