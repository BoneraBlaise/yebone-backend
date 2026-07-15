# TransactionRepository Migration Strategy

**Status:** Approved architecture — closure document (Module 2)  
**Branch:** `feature/payment-foundation`  
**Rule:** Do not delete or rename either repository until Module 7 wiring gate.

---

## 1. Why Both Repositories Exist

| Repository | Path | Purpose |
|------------|------|---------|
| **Legacy skeleton** | `payments/repositories/TransactionRepository.js` | Original v1.0 baseline placeholder wired into `PaymentModule` for `TransactionLedgerService` and `PaymentService`. All methods throw `NotImplementedError`. |
| **Module 2 implementation** | `payments/infrastructure/transactions/TransactionRepository.js` | Production MongoDB repository for the `payment_transactions` collection with lifecycle persistence. |

They were created at different phases of the payment foundation:

- **Phase 0 (baseline):** Architecture defined a generic ledger repository interface (`save`, `findById`, `findByReferenceId`, `listByOwner`) for immutable ledger entries (`payments/domain/Transaction.js`).
- **Phase 2 (Module 2):** Architecture approved a dedicated **payment transaction foundation** with its own schema, state machine, and MongoDB collection (`payment_transactions`).

These serve **related but distinct concerns**:

| Concern | Legacy repo | Module 2 repo |
|---------|-------------|---------------|
| Domain object | `domain/Transaction` (ledger entry) | `PaymentTransaction` document (payment lifecycle) |
| Primary key | `id` / `referenceId` | `transactionId` |
| Operations | Append-only ledger save | CRUD + atomic status transitions |
| Collection | Not defined (never implemented) | `payment_transactions` |
| Wired to PaymentModule | Yes (default) | No (DI factory only) |

---

## 2. Which Is Production vs Legacy

| Role | Repository |
|------|------------|
| **Future production (payment lifecycle)** | `payments/infrastructure/transactions/TransactionRepository` |
| **Legacy (baseline placeholder)** | `payments/repositories/TransactionRepository` |

The legacy repository is **not** a partial implementation of the same thing — it is an **unimplemented contract** from the original ledger design. It must remain until a formal adapter bridges `TransactionLedgerService` to the new foundation.

---

## 3. Which Will Eventually Be Removed

| Repository | Fate |
|------------|------|
| `payments/repositories/TransactionRepository.js` | **Deprecated and removed** after Module 7 adapter wiring is complete and ledger calls are redirected. |
| `payments/infrastructure/transactions/TransactionRepository.js` | **Retained** as the canonical payment transaction persistence layer. |

The legacy file will not be deleted in place — it will be replaced by an adapter that implements the legacy interface while delegating to Module 2 services internally, then the skeleton file will be removed in a final cleanup phase.

---

## 4. Adapter / Alias Requirement

**Yes — an adapter is required** before removing the legacy skeleton.

Proposed adapter (Module 7, not implemented yet):

```
payments/infrastructure/transactions/adapters/
  LedgerTransactionRepositoryAdapter.js
```

Responsibilities:

- Implements legacy interface: `save()`, `findById()`, `findByReferenceId()`, `listByOwner()`
- Delegates `save()` to `TransactionService.createTransaction()` + appropriate lifecycle transition
- Maps `domain/Transaction` fields → `payment_transactions` document fields
- Does **not** expose Module 2 methods through legacy interface

**Alias strategy for imports (Module 3–6):**

```javascript
// Explicit imports — never ambiguous require()
const LegacyTransactionRepository = require("../../repositories/TransactionRepository");
const PaymentTransactionRepository = require("../infrastructure/transactions/TransactionRepository");
```

No barrel export alias until legacy removal. Class name duplication is acceptable during foundation phase; paths disambiguate.

---

## 5. Migration Strategy

### Phase A — Module 2 (complete)

- Module 2 repository live under `infrastructure/transactions/`
- Legacy skeleton unchanged in `PaymentModule`
- No runtime behavior change

### Phase B — Module 3 (TransactionService wiring)

- Wire `TransactionService` via `createTransactionFoundation()` inside payment engine bootstrap
- Still **not** injected into `PaymentModule` default constructor
- Feature flag: `PAYMENT_TRANSACTIONS_ENABLED=false` (default)

### Phase C — Module 4–6 (Idempotency + Engine + Events)

- Payment Engine calls `TransactionService` for lifecycle
- Idempotency layer (Module 1) wraps engine operations
- Events published on status transitions (no direct wallet/audit coupling)

### Phase D — Module 7 (Ledger adapter)

- Implement `LedgerTransactionRepositoryAdapter`
- Inject adapter as `options.transactionRepository` in `PaymentModule`
- `TransactionLedgerService.save()` persists to `payment_transactions`
- Run dual-write validation period (ledger in-memory audit + MongoDB)

### Phase E — Module 8 (Cleanup)

- Remove `payments/repositories/TransactionRepository.js` skeleton
- Update `payments/repositories/index.js` to export adapter or remove export
- Rename adapter to canonical name only after all imports updated

---

## 6. Wiring Strategy for Module 3+

```
PaymentModule (unchanged default until Module 7)
  ├── transactionRepository  → LegacyTransactionRepository (skeleton)
  └── ledger                 → TransactionLedgerService (calls skeleton.save → throws)

Payment Engine Bootstrap (Module 3+, separate composition root)
  ├── idempotencyService     → MongoIdempotencyService (Module 1)
  ├── transactionService       → TransactionService (Module 2)
  └── paymentEngine            → orchestrates providers + transactions

Module 7 bridge:
  PaymentModule({ transactionRepository: new LedgerTransactionRepositoryAdapter({ transactionService }) })
```

**Critical rule:** Module 3 must **not** replace `PaymentModule`'s default `transactionRepository`. Engine bootstrap is a parallel composition root until Module 7 gate.

---

## 7. Risk Controls During Migration

| Risk | Control |
|------|---------|
| Wrong repository injected | Explicit path imports; code review gate on `PaymentModule.js` |
| Ledger/transaction schema mismatch | Adapter mapping document + integration tests |
| Duplicate persistence | Feature flag; idempotency keys on all writes |
| Breaking verify-architecture | Adapter must satisfy legacy interface before skeleton removal |

---

## 8. Decision Log

| Date | Decision |
|------|----------|
| Module 2 | Keep both repositories; document migration path |
| Module 2 closure | Legacy = skeleton; Infrastructure = production target |
| Module 7 | Adapter required before legacy removal |
| Never | Rename either repository during foundation phase |
