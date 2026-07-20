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
| YEBO AI | `marketplace/ai/` | Frozen (`yebo-ai-commerce-agent-v1`) |
| **Delivery Platform** | `marketplace/delivery/` | **8.3 frozen** (`delivery-configuration-v1`) |
| **Growth Platform** | `marketplace/growth/` | **9.2 integrated** (`platform-integration-v1`) |
| **Platform Integration** | `marketplace/integration/` | **9.2.1 remediated** (`enterprise-certification-remediation-v1`) |
| **Growth Commerce** | `marketplace/growth-commerce/` | **10 complete** (`growth-commerce-v1`) |
| **Seller Operations** | `marketplace/seller-operations/` | **11 complete** (`seller-operations-v1`) |
| **Property & Mobility** | `marketplace/property-mobility/` | **12 complete** (`property-mobility-v1`) |

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

## Seller Operations (Phase 11)

Inventory management, purchase orders, supplier management, stock movements, returns (RMA), bulk import/export, SKU/barcode, and seller analytics at `marketplace/seller-operations/`:

- Extends Product Catalog stock via bridge — catalog module unchanged
- Delegates refunds to Orders Platform — no duplicate refund logic
- Super Admin + vendor responsive web panels

See [SELLER_OPERATIONS.md](./SELLER_OPERATIONS.md).

**Seller Operations frozen at `seller-operations-v1`.**

## Property & Mobility (Phase 12)

Property and vehicle listings, search filters, Growth Commerce promotions, Yebone Verified badges, agency accounts, inbox offers, and admin moderation at `marketplace/property-mobility/`:

- Reuses Search Platform optionally for product cross-search
- Reuses Growth Commerce homepage merchandising bridge
- Reuses existing Inbox (Conversation/Messages) for offers and contact
- Super Admin configurable pricing — agency duration, listing limits, and homepage slots admin-configurable
- Configuration syncs to `PlatformFeatureFlagService` on update (Growth Commerce pattern)

See [PROPERTY_MOBILITY.md](./PROPERTY_MOBILITY.md).

**Property & Mobility frozen at `property-mobility-v1`. Production remediation frozen at `property-mobility-remediation-v1`.**

## Commerce Agent (Phase 13)

Secure write-capable AI layer at `marketplace/ai/` — extends YEBO AI without modifying frozen business modules:

- 4 read tools (property search, listing details, growth recommend, seller inventory)
- 2 confirmed write actions (create draft, publish listing)
- In-memory pending action protocol with HMAC checksum, 15 min TTL, replay protection
- Audit via existing `PlatformAuditAdapter`

See [AI_COMMERCE_AGENT.md](./AI_COMMERCE_AGENT.md).

**Commerce Agent frozen at `yebo-ai-commerce-agent-v1`.**

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
