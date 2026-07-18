# Yebone — Release Notes (Pre-AI Foundation)

**Release tag:** `platform-pre-ai-v1`  
**Date:** 2026-07-18  
**Baseline:** `search-production-v1`

This release marks completion of the Yebone marketplace **platform foundation** before Phase 7 (YEBO AI).

---

## Platform Capabilities

| Domain | Capability | Entry Point |
|--------|------------|-------------|
| Payments | Provider orchestration, ledger, legacy v2 bridge | `/api/v2/payment/*`, `/api/v1/payments/*` |
| Vendors | Shop registration, seller management | `/api/v2/shop/*` |
| Catalog | Product CRUD, reviews, likes, media | `/api/v2/product/*` |
| Orders | Create, status, refunds, idempotency | `/api/v2/order/*` |
| Search | Product/shop discovery, filters, pagination | `/api/v2/search/*` |
| Health | Per-module health probes | `/api/v2/marketplace/*/health` |

---

## Supported Workflows

- Customer browse → search → product detail → cart → checkout → payment session
- Seller register → create products → manage orders → update fulfillment status
- Admin product/order oversight via legacy admin routes
- Referral commission on order create (transactional)
- Duplicate-safe order creation with `Idempotency-Key`
- Server-backed search with mobile/desktop responsive UI

---

## Production Readiness

| Area | Status |
|------|--------|
| Payment foundation | Frozen, verified |
| Marketplace platforms | Frozen, verified |
| Order hardening | Idempotency, transactions, inventory guards |
| Search hardening | Validation, rate limits, unicode normalization |
| Architecture verification | `verify:architecture` — no blocking issues |
| Legacy API compatibility | `verify:legacy-migration` — score 100 |
| Full test suite | `verify:platform-pre-ai` — pass |

---

## Security Improvements (Foundation)

- Order endpoint authentication and ownership checks
- Search NoSQL injection and regex escaping guards
- Configurable rate limiting on orders and search
- Mass assignment protection on order create payloads
- Payment facade isolation (no direct SDK in controllers)

---

## Performance Improvements (Foundation)

- Order inventory: atomic MongoDB conditional updates
- Search: lean queries, field projection, parallel count
- Recommended search indexes documented
- Pagination caps prevent unbounded queries

---

## Known Limitations

| Limitation | Planned Phase |
|------------|---------------|
| No semantic/vector search | Phase 7 (YEBO AI) |
| Category taxonomy is string-based | Phase 8 |
| Process-local rate limiting | Future infra |
| Payment sessions outside MongoDB txn | Documented compensation path |
| Legacy `controller/order.js` adapter layer | Remains for API compat |
| Notifications not implemented | Phase 10 |
| Delivery workflow not implemented | Phase 9 |

---

## Future Roadmap

See [DEVELOPMENT_ROADMAP.md](./DEVELOPMENT_ROADMAP.md).

**Next:** Phase 7 — YEBO AI ([YEBO_AI_INTEGRATION_GUIDE.md](./YEBO_AI_INTEGRATION_GUIDE.md))

**Do not begin Phase 7 until `platform-pre-ai-v1` is deployed and frozen.**

---

## Related Documentation

- [PLATFORM_ARCHITECTURE.md](./PLATFORM_ARCHITECTURE.md)
- [PROJECT_STATUS.md](./PROJECT_STATUS.md)
- [CHANGELOG.md](../CHANGELOG.md)
- [FRONTEND_ARCHITECTURE.md](./FRONTEND_ARCHITECTURE.md)
