# YEBO AI — Conversation Memory

**Tag:** `yebo-ai-memory-v1`  
**Baseline:** `yebo-ai-checkout-v1`  
**Status:** IMPLEMENTED (Phase 7.7 — final YEBO AI v1 phase)

Related: [YEBO_AI_ARCHITECTURE.md](./YEBO_AI_ARCHITECTURE.md) · [AI_ASSISTANT.md](./AI_ASSISTANT.md) · [AI_RECOMMENDATIONS.md](./AI_RECOMMENDATIONS.md) · [AI_CHECKOUT_INTELLIGENCE.md](./AI_CHECKOUT_INTELLIGENCE.md)

---

## Objective

Give YEBO AI **session-scoped conversation memory** so users can continue discussing products, vendors, searches, recommendations, and checkout guidance without repeating context.

This is the **final YEBO AI v1 phase**. No long-term memory, no personalization, no persistent profiles.

---

## Architecture

```
User message
    ↓
ConversationMemoryEngine.resolve()
    ↓
ConversationFlowAnalyzer (memory_reference)
    ↓
AIPlanner (resolved product / products / vendor)
    ↓
Existing Tool Registry (Search, Recommend, Checkout, Catalog)
    ↓
MockProvider (uses resolved context — never invents references)
```

---

## ConversationMemoryEngine

**Path:** `marketplace/ai/conversation/ConversationMemoryEngine.js`

### Stored entities (session only)

| Entity | Source |
|--------|--------|
| Current search | `lastSearchRequest` / `currentSearch` |
| Current products | Search / checkout / recommend results |
| Current recommendation | Top `RecommendationTool` result |
| Current comparison | `CheckoutTool` comparisons |
| Current vendor | Product shop metadata |
| Current checkout context | Latest checkout guidance |
| Active product | Focus product for pronoun resolution |

### Reference resolution

| Reference | Resolution |
|-----------|--------------|
| `it`, `that one`, `this one` | Active product → recommendation → comparison winner |
| `the first`, `the second`, `the third` | Ordinal index in `currentProducts` |
| `the cheaper one` | Lowest exposed price in current products |
| `compare the first two` | First two current products |
| `the vendor`, `the seller` | Current vendor / product shop |

Returns `{ hit, miss, references[], resolvedProduct, resolvedProducts, resolvedVendor }`.

---

## Memory lifetime

- **Session scoped** via `AIConversationContext`
- **Automatic expiration** (default TTL: 30 minutes)
- **No permanent storage**
- **No cross-session memory**
- **No user profile memory**

---

## Planner integration

1. Resolve references before flow analysis
2. Update session `currentProduct` / `currentProducts` when resolved
3. Route memory follow-ups to existing tools:
   - Warranty / details → `catalog.product.get`
   - Purchase / availability → `checkout.guide`
   - Compare / value → `checkout.guide`
   - Recommend → `recommend.contextual`
4. Reuse tool results when context is sufficient

---

## MockProvider

When memory resolves a product, MockProvider explains using **resolved context and tool output only** — never inventing references or product facts.

---

## Observability

`AIMetrics` tracks:

- `memoryHits`
- `memoryMisses`
- `referenceResolutions`
- `averageConversationDepth`
- `averageResolvedReferences`

---

## Security

- Memory belongs to **one session only**
- Never leaks between users or sessions
- Never persists customer history

---

## Verification

```bash
npm run test:ai-memory
npm run verify:yebo-ai-memory
```

---

## YEBO AI v1 complete

Restore point: `yebo-ai-memory-v1`

**Out of scope (future work):** persistent user memory, personalization, live LLM providers, embeddings, semantic search.

**Next platform phase:** Delivery (Phase 9+) — not part of YEBO AI v1.
