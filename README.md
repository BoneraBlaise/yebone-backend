# Yebone Server

Backend for the Yebone AI-powered African marketplace platform.

**Platform checkpoint:** `platform-pre-ai-v1`  
**Foundation status:** COMPLETE — frozen before Phase 7 (YEBO AI)

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

---

## Verification

```bash
npm run verify:platform-pre-ai
```

Runs all foundation tests, architecture checks, and legacy migration verification.

---

## Documentation

| Document | Description |
|----------|-------------|
| [docs/PLATFORM_ARCHITECTURE.md](docs/PLATFORM_ARCHITECTURE.md) | Canonical platform architecture |
| [docs/PROJECT_STATUS.md](docs/PROJECT_STATUS.md) | Current status and maturity |
| [docs/DEVELOPMENT_ROADMAP.md](docs/DEVELOPMENT_ROADMAP.md) | Phase roadmap |
| [docs/RELEASE_NOTES_PRE_AI.md](docs/RELEASE_NOTES_PRE_AI.md) | Pre-AI release summary |
| [docs/YEBO_AI_INTEGRATION_GUIDE.md](docs/YEBO_AI_INTEGRATION_GUIDE.md) | Phase 7 AI integration rules |
| [docs/ARCHITECTURE_VERIFICATION_REPORT.md](docs/ARCHITECTURE_VERIFICATION_REPORT.md) | Architecture audit |
| [docs/SEARCH.md](docs/SEARCH.md) | Search platform reference |
| [docs/FRONTEND_ARCHITECTURE.md](docs/FRONTEND_ARCHITECTURE.md) | Frontend UI standard |
| [CHANGELOG.md](CHANGELOG.md) | Milestone history |

---

## Next Phase

**Phase 7 — YEBO AI** — See [docs/YEBO_AI_INTEGRATION_GUIDE.md](docs/YEBO_AI_INTEGRATION_GUIDE.md)

Do not begin Phase 7 until `platform-pre-ai-v1` is deployed.
