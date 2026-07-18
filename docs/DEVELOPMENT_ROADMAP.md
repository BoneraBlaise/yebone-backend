# Yebone — Development Roadmap

**Foundation:** `platform-pre-ai-v1` (frozen)  
**AI design:** `yebo-ai-design-v1` (frozen)  
**Implementation:** Not started

Related: [AI_ROADMAP.md](./AI_ROADMAP.md) · [YEBO_AI_ARCHITECTURE.md](./YEBO_AI_ARCHITECTURE.md) · [PROJECT_STATUS.md](./PROJECT_STATUS.md)

---

## Completed ✅

### Phases 1–6 + Platform Freeze

See [CHANGELOG.md](../CHANGELOG.md). Foundation complete at `platform-pre-ai-v1`.

### Phase 7 — YEBO AI Design

- Complete orchestration architecture for `marketplace/ai/`
- Tool, prompt, provider, security, memory, observability designs
- Frontend YIP reuse plan (no UI redesign)
- Milestones 7.1–7.7 defined with independent freeze tags
- **Tag:** `yebo-ai-design-v1`
- **No implementation code**

---

## Current

**Phase 7.5 contextual recommendations frozen.** Phase 7.6 not started.

Restore points: `platform-pre-ai-v1`, `yebo-ai-design-v1`, `yebo-ai-gateway-v1`, `yebo-ai-tools-v1`, `yebo-ai-search-v1`, `yebo-ai-assistant-v1`, `yebo-ai-recommend-v1`

Branch: `feature/yebo-ai-recommend`

---

## Upcoming — Phase 7 Implementation (continued)

| Milestone | Name | Target tag | Status |
|-----------|------|------------|--------|
| 7.1 | AI Gateway | `yebo-ai-gateway-v1` | ✅ Complete |
| 7.2 | Tool Registry | `yebo-ai-tools-v1` | ✅ Complete |
| 7.3 | Search Integration | `yebo-ai-search-v1` | ✅ Complete |
| 7.4 | Commerce Assistant | `yebo-ai-assistant-v1` | ✅ Complete |
| 7.5 | Recommendations | `yebo-ai-recommend-v1` | ✅ Complete |
| 7.6 | Checkout Intelligence | `yebo-ai-checkout-v1` | Next |
| 7.7 | Conversation Memory | `yebo-ai-memory-v1` |

**Prerequisite:** Deploy `platform-pre-ai-v1` + adopt `yebo-ai-design-v1` blueprint.

---

## Future

### Phase 8 — Inventory & Categories

- Category taxonomy modernization
- Inventory tracking redesign

### Phase 9 — Delivery & Fulfillment

- Shipping workflow and fulfillment pipeline

### Phase 10 — Notifications & Mobile

- Notification pipeline
- Mobile client on shared API contracts

---

## Archive

| Obsolete | Superseded by |
|----------|---------------|
| Client-side LLM keys | `AI_PROVIDER_ARCHITECTURE.md` — backend only |
| `YIPShoppingIntelligence` mock path | `SearchTool` via gateway (7.3) |
| Frontend prompt templates | `AIPromptRegistry` (7.2) |
| Phase 7 prep docs alone | `YEBO_AI_ARCHITECTURE.md` + design suite |

Canonical Phase 7 docs: [YEBO_AI_ARCHITECTURE.md](./YEBO_AI_ARCHITECTURE.md)
