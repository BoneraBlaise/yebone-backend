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

**Phase 9.0 Growth Platform MVP — frozen at `growth-platform-v1`.**

**Growth Platform MVP complete.**

Restore points include: `delivery-configuration-v1`, `growth-platform-v1`

Branch: `feature/growth-platform`

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
| 8.1 | Delivery Tracking | `delivery-tracking-v1` | ✅ Complete |
| 8.2 | Courier Management | `courier-management-v1` | ✅ Complete |
| 8.3 | Delivery Configuration | `delivery-configuration-v1` | ✅ Complete |
| 9.0 | Growth Platform MVP | `growth-platform-v1` | ✅ Complete |
| 9.1 | Growth Platform Completion | `growth-platform-completion-v1` | ✅ Complete |
| 9.2 | Platform Integration | `platform-integration-v1` | ✅ Complete |
| 9.2.1 | Enterprise Certification Remediation | `enterprise-certification-remediation-v1` | ✅ Complete |
| 10 | Growth Commerce | `growth-commerce-v1` | ✅ Complete |
| 11 | Seller Operations & Inventory | `seller-operations-v1` | ✅ Complete |
| 12 | Property & Mobility Marketplace | `property-mobility-v1` | ✅ Complete |

**Property & Mobility frozen at `property-mobility-v1`.**

---

## Future

### Phase 13+ — Deferred

- Loyalty programs
- Cashback
- Wallet
- Advanced analytics
- Native mobile apps

---

## Archive

| Obsolete | Superseded by |
|----------|---------------|
| Client-side LLM keys | `AI_PROVIDER_ARCHITECTURE.md` — backend only |
| `YIPShoppingIntelligence` mock path | `SearchTool` via gateway (7.3) |
| Frontend prompt templates | `AIPromptRegistry` (7.2) |
| Phase 7 prep docs alone | `YEBO_AI_ARCHITECTURE.md` + design suite |

Canonical Phase 7 docs: [YEBO_AI_ARCHITECTURE.md](./YEBO_AI_ARCHITECTURE.md)
