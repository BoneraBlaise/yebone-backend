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

**Phase 8.0 Delivery Module Foundation — frozen at `delivery-foundation-v1`.**

Restore points: `platform-pre-ai-v1`, `yebo-ai-design-v1`, `yebo-ai-gateway-v1`, `yebo-ai-tools-v1`, `yebo-ai-search-v1`, `yebo-ai-assistant-v1`, `yebo-ai-recommend-v1`, `yebo-ai-checkout-v1`, `yebo-ai-memory-v1`, `delivery-foundation-v1`

Branch: `feature/delivery-foundation`

---

## Upcoming — Phase 7 Implementation (continued)

| Milestone | Name | Target tag | Status |
|-----------|------|------------|--------|
| 7.1 | AI Gateway | `yebo-ai-gateway-v1` | ✅ Complete |
| 7.2 | Tool Registry | `yebo-ai-tools-v1` | ✅ Complete |
| 7.3 | Search Integration | `yebo-ai-search-v1` | ✅ Complete |
| 7.4 | Commerce Assistant | `yebo-ai-assistant-v1` | ✅ Complete |
| 7.5 | Recommendations | `yebo-ai-recommend-v1` | ✅ Complete |
| 7.6 | Checkout Intelligence | `yebo-ai-checkout-v1` | ✅ Complete |
| 7.7 | Conversation Memory | `yebo-ai-memory-v1` | ✅ Complete |

**YEBO AI v1 implementation complete.**

| Milestone | Name | Target tag | Status |
|-----------|------|------------|--------|
| 8.0 | Delivery Module Foundation | `delivery-foundation-v1` | ✅ Complete |

**Do not begin Delivery Tracking or Courier Management.**

---

## Future

### Phase 8 — Delivery

| Milestone | Name | Status |
|-----------|------|--------|
| 8.0 | Delivery Module Foundation | ✅ Complete (`delivery-foundation-v1`) |
| 8.1 | Delivery Tracking | Next |
| 8.2 | Courier Management | Planned |

### Phase 9 — Inventory & Categories

- Category taxonomy modernization
- Inventory tracking redesign

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
