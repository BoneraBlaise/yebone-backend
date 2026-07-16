# Phase 3 Rollback Criteria

**Purpose:** Define exactly when Phase 3 implementation must **stop** and return to baseline `payment-foundation-v3`.

This document defines rollback triggers and procedure only. No implementation.

**Baseline tag:** `payment-foundation-v3` (`89766c1`)

**Branch:** `feature/payment-foundation`

---

## Rollback Triggers

Implementation must **halt immediately** if any of the following occur:

### Test & verification failures

| Trigger | Action |
|---------|--------|
| Module 9 provider foundation tests fail | Stop; rollback |
| Module 10 runtime tests fail (206 baseline) | Stop; rollback |
| New Phase 3 tests fail after WP merge | Stop; fix or rollback WP |
| `npm run verify:architecture` fails | Stop; rollback |

### Architecture violations

| Trigger | Action |
|---------|--------|
| `RuntimeExecutionGuard` bypass detected on any RUNTIME_SANDBOX path | Stop; rollback |
| `RuntimeAdapterResolver` no longer sole authority for `ExecutionDecision` | Stop; rollback |
| `RuntimeFactory` no longer composition root for runtime object graphs | Stop; rollback |
| Circular imports introduced in runtime/engine orchestration layer | Stop; rollback |
| Module 9 contract logic duplicated in orchestrator or engine | Stop; rollback |

### Boundary violations

| Trigger | Action |
|---------|--------|
| Module 8 Integration Gate modified | Stop; rollback |
| `ProviderExecutionStage` (or equivalent) added to settlement pipeline | Stop; rollback |
| `PaymentModule` wired to runtime orchestrator | Stop; rollback |
| `server.js`, `app.js`, routes, or controllers wired to runtime | Stop; rollback |
| Production endpoints or production URL registration enabled | Stop; rollback |

### Safety violations

| Trigger | Action |
|---------|--------|
| Production behavior changed when orchestrator not injected | Stop; rollback |
| Runtime feature flag defaults changed to ON | Stop; rollback |
| `liveExecutionEnabled` default changed to `true` | Stop; rollback |
| `PAYMENT_RUNTIME_LIVE` guard removed or weakened | Stop; rollback |
| Sandbox isolation broken (non-sandbox environment allowed) | Stop; rollback |
| Credentials or secrets committed to repository | Stop; rollback; rotate secrets |

### Scope violations (WP-1 specific)

| Trigger | Action |
|---------|--------|
| `verify()`, `payout()`, or `refund()` implemented in WP-1 | Stop; revert scope creep |
| `PaymentEngine` depends on internal runtime structures (not `ExecutionResult`) | Stop; rollback |
| `ProviderExecutionOrchestrator` calls `RuntimeFactory` internally | Stop; rollback (ADR-008) |
| Service Locator or hidden dependency creation in orchestrator | Stop; rollback (ADR-008) |
| Diagnostics wired before WP-5 | Stop; defer to WP-5 |

---

## Rollback Procedure

1. **Stop** all Phase 3 work-in-progress commits to shared branch.
2. **Do not merge** partial Phase 3 work to `main`.
3. **Revert** working branch to `payment-foundation-v3`:
   ```bash
   git checkout feature/payment-foundation
   git reset --hard payment-foundation-v3
   ```
4. **Verify** baseline:
   ```bash
   npm run test:providers:all
   npm run verify:architecture
   ```
5. **Confirm** 206/206 tests pass and architecture verify exits 0.
6. **Document** rollback reason in Phase 3 backlog (`TODO_PHASE3.md`).
7. **Re-review** architecture against `ARCHITECTURE_DECISIONS.md` before resuming.
8. **Obtain** explicit re-approval before restarting affected work package.

---

## Post-Rollback State

After rollback, the repository must match:

- Tag: `payment-foundation-v3`
- Phase 2 frozen — no orchestrator, no `ExecutionResult`
- Feature flags default OFF
- Runtime sandbox-only
- No PaymentEngine runtime wiring
- Integration Gate unchanged

---

## Escalation

| Severity | Escalation |
|----------|------------|
| Architecture or boundary violation | Principal Payment Systems Architect + immediate rollback |
| Security violation (credential leak, guard bypass) | Immediate rollback + security review |
| Test regression only | Fix-forward allowed **only** if fix is isolated and baseline restored within same WP |

**When in doubt, rollback to `payment-foundation-v3`.**
