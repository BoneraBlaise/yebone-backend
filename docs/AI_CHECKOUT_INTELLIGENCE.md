# YEBO AI — Checkout Intelligence

**Tag:** `yebo-ai-checkout-v1`  
**Baseline:** `yebo-ai-recommend-v1`  
**Status:** IMPLEMENTED (Phase 7.6)

Related: [YEBO_AI_ARCHITECTURE.md](./YEBO_AI_ARCHITECTURE.md) · [AI_TOOLS.md](./AI_TOOLS.md) · [AI_RECOMMENDATIONS.md](./AI_RECOMMENDATIONS.md)

---

## Objective

Enable YEBO AI to assist customers **before checkout** with read-only purchase guidance using existing platform data and tool results — without order creation, payments, inventory changes, or personalization.

---

## Architecture

```
User message
    ↓
ConversationFlowAnalyzer (checkout intent)
    ↓
AIPlanner → checkout.guide
    ↓
CheckoutTool
    ├─ reuse session SearchTool / RecommendationTool products
    ├─ optional CatalogTool enrichment (availability)
    └─ CheckoutIntelligenceEngine.buildGuidance()
    ↓
MockProvider explains CheckoutTool output
    ↓
Gateway response { checkout: { guidance, comparisons, availability } }
```

---

## CheckoutIntelligenceEngine

**Path:** `marketplace/ai/checkout/CheckoutIntelligenceEngine.js`

Deterministic evaluation modes:

| Mode | Trigger examples | Output |
|------|------------------|--------|
| `availability` | “Is it available?”, “Can I buy today?” | Stock-based purchase readiness |
| `compare` | “Compare these”, “Which is cheaper?” | Ranked product comparisons |
| `value` | “Better value?”, “Worth buying?” | Price-led buying guidance |
| `purchase` | “Should I buy this?” | General purchase guidance |

Signals used (only when exposed):

- Availability (`stock`, `sold_out`)
- Price (`discountPrice`, `pricing`)
- Rating (`averageRating`, `ratings`)
- Popularity (`featured`)
- Vendor (`shop.name`)
- Recommendation reasons (from prior RecommendationTool output)

**Never invents unavailable data.**

---

## CheckoutTool

**ID:** `checkout.guide`  
**Version:** `7.6.0`  
**Permissions:** `public` (read-only)

### Guarantees

- ✔ Reuses existing tool results
- ✔ Compares products transparently
- ✘ Never creates orders
- ✘ Never triggers payments
- ✘ Never modifies inventory

### Output

```javascript
{
  guidance: ["..."],
  comparisons: [
    {
      rank: 1,
      preview: { id, name, discountPrice, images },
      considerations: ["Available in stock", "Listed at RWF 180000"],
      signals: { available: true, price: 180000 },
      availability: { available: true, stock: 4 }
    }
  ],
  availability: { available: true, guidance: ["..."] },
  meta: {
    engine: "CheckoutIntelligenceEngine",
    readOnly: true,
    orderCreation: false,
    paymentExecution: false,
    inventoryModification: false
  }
}
```

---

## Planner Routing

Checkout intent examples:

- “Should I buy this?”
- “Compare these.”
- “Which is cheaper overall?”
- “Can I purchase now?”
- “Is this product currently available?”

Flow type: `checkout_request` → intent `checkout` → tool `checkout.guide`.

Recommendation intent remains separate (“Which one do you recommend?”).

---

## MockProvider

MockProvider prioritizes CheckoutTool output over recommendations and explains:

- Comparison winners with tool-provided considerations
- Availability guidance from catalog stock data
- Never invents product facts

---

## Observability

`AIMetrics` tracks:

- `checkoutRequests`
- `checkoutComparisons`
- `checkoutGuidanceGenerations`
- `checkoutReuseCount`
- `averageCheckoutLatencyMs`

---

## Frontend (minimal)

No UI redesign. `GatewayAssistantAdapter` maps `checkout.comparisons` into existing product card rendering via the assistant conversation UI.

---

## Verification

```bash
npm run test:ai-checkout
npm run verify:yebo-ai-checkout
```

---

## Out of Scope (Phase 7.6)

- Payment processing
- Order creation
- Persistent memory / personalization
- Live LLM providers
- Embeddings / semantic search
- Fraud detection / coupons / inventory reservation

**Next milestone:** Phase 7.7 Conversation Memory (`yebo-ai-memory-v1`)
