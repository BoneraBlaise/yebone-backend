# Phase 7 Preparation — YEBO AI

**Baseline:** `platform-pre-ai-v1`  
**Status:** Foundation complete — Phase 7 not started

> **Canonical guide:** [YEBO_AI_INTEGRATION_GUIDE.md](./YEBO_AI_INTEGRATION_GUIDE.md)

Do not begin Phase 7 until `platform-pre-ai-v1` is tagged, verified, and deployed.

---

## Prerequisites (Verified at Checkpoint)

- [x] All foundation modules frozen through `search-production-v1`
- [x] Platform architecture documented ([PLATFORM_ARCHITECTURE.md](./PLATFORM_ARCHITECTURE.md))
- [x] Full verification passing (`npm run verify:platform-pre-ai`)
- [x] Frontend architecture frozen ([FRONTEND_ARCHITECTURE.md](./FRONTEND_ARCHITECTURE.md))
- [x] AI integration rules defined ([YEBO_AI_INTEGRATION_GUIDE.md](./YEBO_AI_INTEGRATION_GUIDE.md))

---

## Quick Reference

| Rule | Detail |
|------|--------|
| AI orchestrates | Existing platforms via public APIs and Platform classes |
| AI never duplicates | SearchService, OrderService, ProductService, ShopService logic |
| AI never bypasses | Validation, state machines, idempotency, payment facade |
| Frontend | Extend existing shells — do not create parallel layouts |

See the full integration guide for allowed interfaces, forbidden bypasses, and hook extension points.

---

## Out of Scope for Phase 7

- Vector / semantic search indexes
- Personalization engine
- Voice search
- Recommendation ML models
- Autonomous order/payment mutations without user confirmation

---

## Related Documentation

- [PLATFORM_ARCHITECTURE.md](./PLATFORM_ARCHITECTURE.md)
- [RELEASE_NOTES_PRE_AI.md](./RELEASE_NOTES_PRE_AI.md)
- [PROJECT_STATUS.md](./PROJECT_STATUS.md)
- [DEVELOPMENT_ROADMAP.md](./DEVELOPMENT_ROADMAP.md)
