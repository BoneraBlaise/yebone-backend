# Yebone Server

Backend for the Yebone AI-powered African marketplace platform.

**Foundation checkpoint:** `platform-pre-ai-v1`  
**AI design freeze:** `yebo-ai-design-v1`  
**AI gateway:** `yebo-ai-gateway-v1` (Phase 7.1 complete)  
**Next:** Phase 7.2 — Tool Registry

---

## Quick Start

```bash
npm install
cp .env.example .env   # configure MongoDB, JWT, payment providers
npm run dev
```

Server entry: `server.js`  
API base: `/api/v2/*`

---

## Platform Modules (Frozen)

| Module | Path | Tag |
|--------|------|-----|
| Payment Foundation | `payments/` | `payment-foundation-v10` |
| Marketplace Core | `marketplace/core/` | `marketplace-core-v1` |
| Vendor Platform | `marketplace/vendor/` | `vendor-management-v1` |
| Product Catalog | `marketplace/catalog/` | `product-catalog-v1` |
| Orders | `marketplace/orders/` | `orders-production-v1` |
| Search | `marketplace/search/` | `search-production-v1` |

Do not modify frozen modules without explicit unfreeze.

**YEBO AI (designed, not built):** `marketplace/ai/` — see design docs below.

---

## Verification

```bash
npm run verify:platform-pre-ai
```

---

## Documentation

### Platform

| Document | Description |
|----------|-------------|
| [docs/PLATFORM_ARCHITECTURE.md](docs/PLATFORM_ARCHITECTURE.md) | Canonical platform architecture |
| [docs/PROJECT_STATUS.md](docs/PROJECT_STATUS.md) | Current status |
| [docs/DEVELOPMENT_ROADMAP.md](docs/DEVELOPMENT_ROADMAP.md) | Phase roadmap |
| [CHANGELOG.md](CHANGELOG.md) | Milestone history |

### YEBO AI (design — permanent blueprint)

| Document | Description |
|----------|-------------|
| [docs/AI_GATEWAY.md](docs/AI_GATEWAY.md) | Phase 7.1 gateway reference |
| [docs/YEBO_AI_ARCHITECTURE.md](docs/YEBO_AI_ARCHITECTURE.md) | **Canonical AI architecture** |
| [docs/AI_TOOLS.md](docs/AI_TOOLS.md) | Tool registry design |
| [docs/PROMPT_ARCHITECTURE.md](docs/PROMPT_ARCHITECTURE.md) | Prompt system |
| [docs/AI_PROVIDER_ARCHITECTURE.md](docs/AI_PROVIDER_ARCHITECTURE.md) | Provider abstraction |
| [docs/AI_SECURITY.md](docs/AI_SECURITY.md) | Security design |
| [docs/AI_ROADMAP.md](docs/AI_ROADMAP.md) | Implementation milestones 7.1–7.7 |
| [docs/YEBO_AI_INTEGRATION_GUIDE.md](docs/YEBO_AI_INTEGRATION_GUIDE.md) | Frozen platform integration rules |

---

## Next Phase

**Phase 7.2 — Tool Registry** — See [docs/AI_ROADMAP.md](docs/AI_ROADMAP.md)

Gateway frozen at `yebo-ai-gateway-v1`. Do not begin 7.2 until deployed.
