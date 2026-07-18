# Yebone — Project Status

**Last updated:** 2026-07-18  
**Design tag:** `yebo-ai-design-v1`  
**Gateway tag:** `yebo-ai-gateway-v1`  
**Tools tag:** `yebo-ai-tools-v1`  
**Search tag:** `yebo-ai-search-v1`  
**Assistant tag:** `yebo-ai-assistant-v1`  
**Foundation tag:** `platform-pre-ai-v1`  
**Current branch:** `feature/yebo-ai-assistant`

---

## Project Name

**Yebone** — AI-powered African marketplace platform.

---

## Platform Foundation — COMPLETE & FROZEN

Frozen at `platform-pre-ai-v1`. Business modules unchanged.

---

## Phase 7 — GATEWAY COMPLETE (7.1)

| Aspect | Status |
|--------|--------|
| `marketplace/ai/` module | ✔ Implemented |
| Gateway endpoints | ✔ `/api/v2/ai/chat`, `/api/v2/ai/search` |
| Mock provider | ✔ Active |
| Prompt registry | ✔ Versioned templates |
| Frontend gateway client | ✔ `YIPGatewayClient` |

**Tag:** `yebo-ai-gateway-v1` · **Doc:** [AI_GATEWAY.md](./AI_GATEWAY.md)

---

## Phase 7.2 — TOOL REGISTRY COMPLETE

| Aspect | Status |
|--------|--------|
| Production tools (7) | ✔ Platform-integrated |
| ToolResult contract | ✔ Unified |
| Capability registry | ✔ Planner routing |
| Observability | ✔ Tool/planner metrics |
| **Phase 7.3+** | **Not started** |

**Tag:** `yebo-ai-tools-v1` · **Doc:** [AI_TOOL_CONTRACTS.md](./AI_TOOL_CONTRACTS.md)

---

## Phase 7.3 — NATURAL LANGUAGE SEARCH COMPLETE

| Aspect | Status |
|--------|--------|
| NL → structured search params | ✔ `SearchParameterExtractor` |
| English + Kinyarwanda + mixed | ✔ Rule-based extraction |
| Planner searchRequest attachment | ✔ |
| SearchTool → SearchPlatform delegation | ✔ No local filtering |
| Frontend gateway result rendering | ✔ `AISearchNatural` unchanged layout |
| **Phase 7.4+** | **Not started** |

**Tag:** `yebo-ai-search-v1` · **Doc:** [AI_SEARCH.md](./AI_SEARCH.md)

---

## Phase 7.4 — COMMERCE ASSISTANT COMPLETE

| Aspect | Status |
|--------|--------|
| Multi-turn conversations | ✔ Session-scoped |
| Follow-up detection | ✔ `ConversationFlowAnalyzer` |
| Tool reuse | ✔ Prior ToolResult in session |
| Tool re-execution | ✔ Search refinements / topic switch |
| No persistent memory | ✔ In-memory TTL context only |
| MockProvider | ✔ Unchanged |
| **Phase 7.5+** | **Not started** |

**Tag:** `yebo-ai-assistant-v1` · **Doc:** [AI_ASSISTANT.md](./AI_ASSISTANT.md)

---

## Phase 7 Design — COMPLETE

YEBO AI production architecture is **designed and frozen** at `yebo-ai-design-v1`.

| Aspect | Status |
|--------|--------|
| AI platform module design | ✔ `marketplace/ai/` blueprint |
| Tool architecture | ✔ 7 core tools defined |
| Prompt architecture | ✔ Versioned registry design |
| Provider architecture | ✔ Backend-only keys |
| Security architecture | ✔ Documented |
| Memory architecture | ✔ Documented |
| Observability design | ✔ Documented |
| Frontend integration plan | ✔ YIP UI reuse |
| Implementation roadmap | ✔ Milestones 7.1–7.7 |
| **Implementation code** | **✗ Not started** |

**Canonical blueprint:** [YEBO_AI_ARCHITECTURE.md](./YEBO_AI_ARCHITECTURE.md)

---

## Current Architecture

| Layer | Role | Status |
|-------|------|--------|
| **Payment Foundation** | Provider orchestration, ledger, webhooks | Frozen |
| **Marketplace Core** | Configuration, lifecycle, health, hooks | Frozen |
| **Vendor Platform** | Shop registration, seller profile | Frozen |
| **Product Catalog** | Product CRUD, reviews, media | Frozen |
| **Orders Platform** | Order lifecycle, idempotency, inventory guards | Frozen |
| **Search Platform** | Product/shop discovery, suggestions, pagination | Frozen |
| **YEBO AI (gateway + tools + NL search + assistant)** | Orchestration layer | **7.4 frozen** (`yebo-ai-assistant-v1`) |
| **Legacy v2 API** | Express controllers at `/api/v2/*` | Production |
| **Frontend** | React SPA + YIP UI (mock intelligence) | Frozen architecture |

---

## Completed Phases

| Phase | Name | Tag(s) |
|-------|------|--------|
| 1–6 | Foundation modules | Through `search-production-v1` |
| Checkpoint | Platform Freeze | `platform-pre-ai-v1` |
| **7.1 (gateway)** | **AI Gateway Foundation** | **`yebo-ai-gateway-v1`** |

---

## Next Step

**Phase 7.2 — Tool Registry** — See [AI_ROADMAP.md](./AI_ROADMAP.md)

---

## Key Documentation

| Document | Purpose |
|----------|---------|
| [AI_GATEWAY.md](./AI_GATEWAY.md) | Phase 7.1 gateway reference |
| [YEBO_AI_ARCHITECTURE.md](./YEBO_AI_ARCHITECTURE.md) | Canonical AI blueprint |
| [AI_TOOLS.md](./AI_TOOLS.md) | Tool registry design |
| [PROMPT_ARCHITECTURE.md](./PROMPT_ARCHITECTURE.md) | Prompt system |
| [AI_PROVIDER_ARCHITECTURE.md](./AI_PROVIDER_ARCHITECTURE.md) | Provider abstraction |
| [AI_SECURITY.md](./AI_SECURITY.md) | Security design |
| [AI_ROADMAP.md](./AI_ROADMAP.md) | Milestones 7.1–7.7 |
| [PLATFORM_ARCHITECTURE.md](./PLATFORM_ARCHITECTURE.md) | Platform architecture |
| [YEBO_AI_INTEGRATION_GUIDE.md](./YEBO_AI_INTEGRATION_GUIDE.md) | Integration rules |

---

## Verification

```bash
npm run verify:yebo-ai-gateway
```
