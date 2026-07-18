# Yebone Architecture

Canonical platform architecture for Yebone backend modules.

**Primary document:** [PLATFORM_ARCHITECTURE.md](./PLATFORM_ARCHITECTURE.md)

This index tracks architecture milestones across foundation, AI, and delivery layers.

---

## Layer Summary

| Layer | Path | Status |
|-------|------|--------|
| Payment Foundation | `payments/` | Frozen (`payment-foundation-v10`) |
| Marketplace Core | `marketplace/core/` | Frozen (`marketplace-core-v1`) |
| Vendor Platform | `marketplace/vendor/` | Frozen |
| Product Catalog | `marketplace/catalog/` | Frozen |
| Orders Platform | `marketplace/orders/` | Frozen |
| Search Platform | `marketplace/search/` | Frozen |
| YEBO AI | `marketplace/ai/` | Frozen (`yebo-ai-memory-v1`) |
| **Delivery Platform** | `marketplace/delivery/` | **8.0 frozen** (`delivery-foundation-v1`) |

---

## Delivery Platform (Phase 8.0)

Independent delivery domain for marketplace fulfillment:

- `DeliveryPlatform` composition root
- Validated lifecycle state machine
- Structured addresses and tracking numbers
- Courier assign / reassign / remove
- Session-scoped in-memory repository (foundation)
- Health + metrics at `/api/v2/marketplace/delivery/*`

See [DELIVERY_MODULE.md](./DELIVERY_MODULE.md) for API and lifecycle details.

---

## Related Documents

- [PLATFORM_ARCHITECTURE.md](./PLATFORM_ARCHITECTURE.md) — module boundaries, dependency graph, request lifecycle
- [YEBO_AI_ARCHITECTURE.md](./YEBO_AI_ARCHITECTURE.md) — AI orchestration blueprint
- [PROJECT_STATUS.md](./PROJECT_STATUS.md) — phase completion status
- [DEVELOPMENT_ROADMAP.md](./DEVELOPMENT_ROADMAP.md) — upcoming work
