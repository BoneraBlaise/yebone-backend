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
| **Delivery Platform** | `marketplace/delivery/` | **8.3 frozen** (`delivery-configuration-v1`) |
| **Growth Platform** | `marketplace/growth/` | **9.2 integrated** (`platform-integration-v1`) |
| **Platform Integration** | `marketplace/integration/` | **9.2.1 remediated** (`enterprise-certification-remediation-v1`) |
| **Growth Commerce** | `marketplace/growth-commerce/` | **10 complete** (`growth-commerce-v1`) |

---

## Growth Platform (Phase 9.0–9.1)

Unified growth orchestration at `marketplace/growth/`:

- `GrowthPlatform` orchestrates referral, coupon, promotion validation, commission, and reward ledger
- `GrowthConfigurationPlatform` + `GrowthFeatureFlagService` + route guards
- `CommissionRuleAdminService` + `CommissionRuleSimulatorService` (Phase 9.1)
- `CouponRedemptionService` + order-time validation (Phase 9.1)
- Payments Commission Engine is the only commission calculator
- Legacy adapters preserve existing Commission, Coupon, FlashSale, and Event data

See [GROWTH_PLATFORM.md](./GROWTH_PLATFORM.md).

**Platform Integration frozen at `platform-integration-v1`.**

**Enterprise Certification Remediation (9.2.1) frozen at `enterprise-certification-remediation-v1`.**

## Growth Commerce (Phase 10)

Campaign management, homepage merchandising, affiliate/ambassador extensions, marketing dashboards, automation, search enrichment, and AI recommendations at `marketplace/growth-commerce/`:

- Extends Growth Platform — no duplicate promotion validation
- Wraps Search Platform for campaign badges — Search module unchanged
- Exposes AI recommendations API — YEBO AI module unchanged
- Super Admin + vendor responsive web panels

See [GROWTH_COMMERCE.md](./GROWTH_COMMERCE.md).

**Growth Commerce frozen at `growth-commerce-v1`.**

See [PLATFORM_INTEGRATION.md](./PLATFORM_INTEGRATION.md).

---

## Delivery Platform (Phase 8.0–8.3)

Independent delivery domain with lifecycle foundation, tracking timeline, courier management, and Super Admin configuration:

- `DeliveryPlatform` + `TrackingService`
- `CourierPlatform` + `CourierAssignmentBridge`
- `DeliveryConfigurationPlatform` + `FeatureFlagService` + route guards
- Capacity-aware courier assignment integrated via public delivery APIs

See [DELIVERY_MODULE.md](./DELIVERY_MODULE.md), [DELIVERY_TRACKING.md](./DELIVERY_TRACKING.md), [COURIER_MANAGEMENT.md](./COURIER_MANAGEMENT.md), and [DELIVERY_CONFIGURATION.md](./DELIVERY_CONFIGURATION.md).

**Delivery MVP complete.**

---

## Related Documents

- [PLATFORM_ARCHITECTURE.md](./PLATFORM_ARCHITECTURE.md) — module boundaries, dependency graph, request lifecycle
- [YEBO_AI_ARCHITECTURE.md](./YEBO_AI_ARCHITECTURE.md) — AI orchestration blueprint
- [PROJECT_STATUS.md](./PROJECT_STATUS.md) — phase completion status
- [DEVELOPMENT_ROADMAP.md](./DEVELOPMENT_ROADMAP.md) — upcoming work
