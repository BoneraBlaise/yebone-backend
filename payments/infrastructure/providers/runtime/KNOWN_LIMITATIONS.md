# Module 10 Phase 1 — Known Limitations

These limitations are **intentional** for Phase 1. They will be addressed in Phase 2+.

---

## Current Scope

- Runtime architecture only
- Sandbox only
- Mock transport only (no live network in tests; live HTTP blocked by default)

---

## Not Implemented

- Production execution
- PaymentModule wiring
- Runtime registry wiring
- Runtime resolver wiring
- MTN Refund
- Paypack Checkout
- Production webhooks
- Secret Manager (stub only)
- Vault (stub only)
- Distributed transactions
- Durable event outbox
- Runtime metrics
- Runtime tracing

---

## Safety

- `liveExecutionEnabled` defaults to `false`
- Provider feature flags default **OFF**
- Runtime isolated from production (`PaymentModule`, routes, `server.js` unchanged)
- No production HTTP calls
- No production endpoints configured

---

## Notes

Phase 1 delivers sandbox-first provider runtime infrastructure with mock HTTP testing only. See `TODO_PHASE2.md` for the planned backlog.
