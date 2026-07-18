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
| **Delivery Platform** | `marketplace/delivery/` | **8.2 frozen** (`courier-management-v1`) |

---

## Delivery Platform (Phase 8.0–8.2)

Independent delivery domain with lifecycle foundation, tracking timeline, and courier management:

- `DeliveryPlatform` + `TrackingService`
- `CourierPlatform` + `CourierAssignmentBridge`
- Capacity-aware courier assignment integrated via public delivery APIs

See [DELIVERY_MODULE.md](./DELIVERY_MODULE.md), [DELIVERY_TRACKING.md](./DELIVERY_TRACKING.md), and [COURIER_MANAGEMENT.md](./COURIER_MANAGEMENT.md).

---

## Related Documents

- [PLATFORM_ARCHITECTURE.md](./PLATFORM_ARCHITECTURE.md) — module boundaries, dependency graph, request lifecycle
- [YEBO_AI_ARCHITECTURE.md](./YEBO_AI_ARCHITECTURE.md) — AI orchestration blueprint
- [PROJECT_STATUS.md](./PROJECT_STATUS.md) — phase completion status
- [DEVELOPMENT_ROADMAP.md](./DEVELOPMENT_ROADMAP.md) — upcoming work
