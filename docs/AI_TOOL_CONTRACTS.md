# YEBO AI — Tool Contracts (Phase 7.2)

**Tag:** `yebo-ai-tools-v1`  
**Baseline:** `yebo-ai-gateway-v1`  
**Module:** `marketplace/ai/tools/`

Related: [AI_TOOLS.md](./AI_TOOLS.md) · [AI_GATEWAY.md](./AI_GATEWAY.md) · [YEBO_AI_ARCHITECTURE.md](./YEBO_AI_ARCHITECTURE.md)

---

## Unified Tool Contract

Every tool implements:

| Method | Purpose |
|--------|---------|
| `initialize()` | Bootstrap tool instance |
| `health()` | Tool + platform readiness probe |
| `capabilities()` | Capability strings for planner routing |
| `execute(input, context)` | Platform delegation (returns data only) |
| `metadata()` | Registry listing metadata |

Execution via `tool.run()` or `AIToolRegistry.execute()` returns:

```json
{
  "success": true,
  "tool": "search.products",
  "version": "7.2.0",
  "latency": 42,
  "data": {},
  "metadata": { "correlationId": "uuid", "platform": "SearchPlatform" },
  "error": null
}
```

Failures set `success: false` and populate `error`:

```json
{
  "code": "permission_denied",
  "message": "AIToolRegistry: permission_denied",
  "statusCode": 403
}
```

---

## SearchTool (`search.products`)

| Field | Value |
|-------|-------|
| Platform | `SearchPlatform` → `SearchService` |
| Permissions | `public` |
| Timeout | 30s (planner/gateway) |
| Capabilities | `keyword`, `category`, `filters`, `pagination`, `sort`, `suggestions` |

**Input**

| Field | Type | Notes |
|-------|------|-------|
| `action` | string | `keyword` (default), `shops`, `suggest`, `categories` |
| `q` / `query` | string | Keyword |
| `category` | string | Category filter |
| `minPrice`, `maxPrice` | number | Price range |
| `minRating` | number | Rating filter |
| `inStock`, `featured`, `discounted` | boolean | Availability / promos |
| `page`, `limit`, `sort` | mixed | Pagination and ranking |

**Output:** `{ products[], meta }` or `{ shops[], meta }` — unchanged SearchPlatform shape.

**Errors:** Platform validation errors propagate as tool failures. Tool never builds Mongo filters locally.

---

## CatalogTool (`catalog.product.get`)

| Field | Value |
|-------|-------|
| Platform | `ProductPlatform.catalog`, `ProductPlatform.pricing`, `SearchPlatform` (featured/discounts) |
| Permissions | `public` |
| Capabilities | `product_lookup`, `product_details`, `product_metadata`, `featured_products`, `discounts` |

**Input:** `{ action, productId, shopId, limit, page, sort }`

**Output:** Sanitized product summary + pricing/metadata. Featured/discount actions delegate to SearchPlatform.

**Errors:** `MISSING_PRODUCT_ID` (400)

---

## VendorTool (`vendor.shop.get`)

| Field | Value |
|-------|-------|
| Platform | `VendorPlatform.profile`, `VendorPlatform.analytics`, optional `SearchPlatform` |
| Permissions | `public` |
| Capabilities | `seller_lookup`, `shop_lookup`, `store_metadata`, `store_statistics` |

**Input:** `{ action, shopId, q, page, limit }`

**Output:** `{ shop, seller, storeMetadata, statistics }` — no credentials or withdraw methods.

**Errors:** `MISSING_SHOP_ID` (400)

---

## OrderTool (`order.get`) — READ ONLY

| Field | Value |
|-------|-------|
| Platform | `OrderPlatform.history`, `OrderPlatform.status` |
| Permissions | `authenticated` (owner only) |
| Capabilities | `history`, `tracking`, `order_details`, `order_status` |

**Allowed actions:** `history`, `details`, `tracking`, `status`

**Rejected actions:** `cancel`, `refund`, `update`, `update_status` → `mutation_not_supported` (403)

**Errors:** `order_access_denied` (403), `MISSING_ORDER_ID` (400)

---

## PaymentTool (`payment.readiness`) — READ ONLY

| Field | Value |
|-------|-------|
| Platform | `PaymentIntegrationHook` (via `MarketplaceCore.hooks.payment`) |
| Permissions | `public` |
| Capabilities | `readiness`, `supported_providers`, `payment_availability`, `health` |

**Output:** Readiness, enabled flags, supported provider labels, health snapshot. No charges or session creation.

**Rejected actions:** `charge`, `create`, `pay`, `initiate` → `mutation_not_supported` (403)

---

## RecommendationTool (`recommend.contextual`)

| Field | Value |
|-------|-------|
| Composition | `SearchTool` + `CatalogTool` |
| Permissions | `public` |
| Capabilities | `recommendations`, `candidate_composition` |

**Output:** `{ candidates[], meta: { composedFrom: ["SearchTool", "CatalogTool"] } }`

No ML ranking in Phase 7.2 — structured candidates only.

---

## KnowledgeTool (`knowledge.faq`)

| Field | Value |
|-------|-------|
| Source | `marketplace/ai/tools/knowledgeContent.js` (platform docs) |
| Permissions | `public` |
| Capabilities | `faq`, `policy`, `shipping`, `payment_help`, `platform_docs` |

**Input:** `{ q, topic, limit }`

**Output:** `{ articles[], meta }`

---

## Capability Registry

`AICapabilityRegistry` maps capabilities → tool IDs. The planner resolves intents to capabilities, then selects the highest-scoring tool. **Tool names are never hardcoded in planner routing logic.**

---

## Verification

```bash
npm run test:ai-tools
npm run verify:yebo-ai-tools
```
