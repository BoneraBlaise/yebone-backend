# Audit Timeline Design — Module 3 Closure

**Branch:** `feature/payment-foundation`  
**Status:** Event ordering design only — no implementation  
**Purpose:** Define the canonical sequence of audit actions for future financial flows

---

## 1. Design Principles

1. **Ordering describes causality** — events listed earlier enable events listed later.
2. **Not every flow includes every event** — COD orders skip provider events; partial refunds skip full settlement.
3. **Actions are append-only** — corrections appear as new events (e.g. `ADMIN_OVERRIDE`), never mutations.
4. **Parallel events** are marked — some events may occur concurrently but audit timestamps establish order.
5. **Extensible** — new actions follow `^[A-Z][A-Z0-9_]{2,127}$` (Module 3 `AuditEvent` contract).

---

## 2. Master Timeline — Standard Card / Mobile Money Checkout

Ordered sequence for a successful online payment with escrow and settlement:

```
 1. PAYMENT_CREATED
 2. PAYMENT_PENDING
 3. PAYMENT_AUTHORIZED          (optional — auth/capture split)
 4. PAYMENT_CAPTURED
 5. ESCROW_HELD
 6. ORDER_PAYMENT_COMPLETED      (order domain acknowledgment)
 7. ORDER_DELIVERED             (fulfillment — future action)
 8. ESCROW_RELEASED              (or ESCROW_HELD remains until release)
 9. SETTLEMENT_COMPLETED
10. WALLET_CREDITED
11. SYSTEM_EVENT                 (optional — reconciliation confirmation)
```

---

## 3. Flow Diagrams

### 3.1 Payment initiation → capture

```
PAYMENT_CREATED
    │
    ▼
PAYMENT_PENDING          ← provider request sent
    │
    ├──► PAYMENT_FAILED      (terminal branch)
    │
    ▼
PAYMENT_AUTHORIZED       ← optional (pre-auth providers)
    │
    ▼
PAYMENT_CAPTURED         ← funds confirmed
    │
    ▼
PAYMENT_SETTLED          ← provider settlement confirmed (may follow via webhook)
```

### 3.2 Escrow lifecycle

```
PAYMENT_CAPTURED
    │
    ▼
ESCROW_HELD              ← funds locked for order protection
    │
    ├──► ORDER_PAYMENT_COMPLETED
    │
    ▼
ORDER_DELIVERED          ← buyer confirms / delivery proof (future)
    │
    ▼
ESCROW_RELEASED          ← funds released to seller pipeline
    │
    ▼
SETTLEMENT_COMPLETED
    │
    ▼
WALLET_CREDITED
```

### 3.3 Payout lifecycle (seller → bank/mobile money)

```
WALLET_DEBITED           ← optional — reserve for payout
    │
    ▼
PAYOUT_REQUESTED
    │
    ├──► ADMIN_OVERRIDE    ← manual intervention (optional)
    │
    ▼
PAYOUT_APPROVED
    │
    ├──► PAYOUT_FAILED     ← future terminal action (provider reject)
    │
    ▼
PAYOUT_COMPLETED
```

### 3.4 Refund lifecycle

```
REFUND_REQUESTED         ← future action (not in Module 3 enum yet — extensible)
    │
    ▼
PAYMENT_REFUNDED         ← or partial: status → PARTIALLY_REFUNDED on transaction
    │
    ▼
REFUND_COMPLETED         ← future action — provider confirmation
    │
    ├──► WALLET_DEBITED      (if wallet was credited)
    └──► ESCROW_RELEASED      (if escrow reversal)
```

---

## 4. Event Catalog by Domain

### 4.1 Payment events

| Order | Action | Typical trigger | Resource type |
|-------|--------|-----------------|---------------|
| 1 | `PAYMENT_CREATED` | TransactionService.createTransaction | TRANSACTION |
| 2 | `PAYMENT_UPDATED` | Metadata/status patch (non-terminal) | TRANSACTION |
| 3 | `PAYMENT_PENDING` | Provider request initiated | TRANSACTION |
| 4 | `PAYMENT_AUTHORIZED` | Pre-auth success | TRANSACTION |
| 5 | `PAYMENT_CAPTURED` | Funds captured | TRANSACTION |
| 6 | `PAYMENT_SETTLED` | Provider settlement confirmed | TRANSACTION |
| 7 | `PAYMENT_FAILED` | Terminal failure | TRANSACTION |
| 8 | `PAYMENT_REFUNDED` | Refund processed | REFUND / TRANSACTION |

### 4.2 Escrow events

| Order | Action | Typical trigger | Resource type |
|-------|--------|-----------------|---------------|
| 1 | `ESCROW_HELD` | Post-capture hold | ESCROW |
| 2 | `ORDER_PAYMENT_COMPLETED` | Order linked to payment | ORDER |
| 3 | `ORDER_DELIVERED` | Fulfillment complete | ORDER |
| 4 | `ESCROW_RELEASED` | Hold released | ESCROW |

### 4.3 Wallet events

| Order | Action | Typical trigger | Resource type |
|-------|--------|-----------------|---------------|
| 1 | `WALLET_CREDITED` | Settlement to seller | WALLET |
| 2 | `WALLET_DEBITED` | Payout reserve or refund reversal | WALLET |

### 4.4 Payout events

| Order | Action | Typical trigger | Resource type |
|-------|--------|-----------------|---------------|
| 1 | `PAYOUT_REQUESTED` | Seller requests withdrawal | PAYOUT |
| 2 | `PAYOUT_APPROVED` | Admin/system approval | PAYOUT |
| 3 | `PAYOUT_COMPLETED` | Provider confirms transfer | PAYOUT |

### 4.5 Settlement events

| Order | Action | Typical trigger | Resource type |
|-------|--------|-----------------|---------------|
| 1 | `SETTLEMENT_COMPLETED` | SettlementEngine completes batch | TRANSACTION / ORDER |

*Note: `SETTLEMENT_COMPLETED` is a future extensible action — add to `AuditAction` enum at Payment Engine module.*

### 4.6 Refund events

| Order | Action | Typical trigger | Resource type |
|-------|--------|-----------------|---------------|
| 1 | `REFUND_REQUESTED` | Buyer/seller initiates | REFUND |
| 2 | `PAYMENT_REFUNDED` | Platform processes | REFUND |
| 3 | `REFUND_COMPLETED` | Provider confirms | REFUND |

### 4.7 Administrative / system

| Action | When |
|--------|------|
| `ADMIN_OVERRIDE` | Manual status correction, force release, compliance hold |
| `SYSTEM_EVENT` | Reconciliation, batch jobs, health corrections |

---

## 5. Composite Timelines by Scenario

### Scenario A — Successful MTN MoMo checkout (Module 8 target)

```
1.  PAYMENT_CREATED
2.  PAYMENT_PENDING
3.  PAYMENT_CAPTURED
4.  ESCROW_HELD
5.  ORDER_PAYMENT_COMPLETED
6.  ORDER_DELIVERED
7.  ESCROW_RELEASED
8.  SETTLEMENT_COMPLETED
9.  WALLET_CREDITED
```

### Scenario B — Failed provider charge

```
1. PAYMENT_CREATED
2. PAYMENT_PENDING
3. PAYMENT_FAILED
```

### Scenario C — Full refund before delivery

```
1. PAYMENT_CREATED
2. PAYMENT_PENDING
3. PAYMENT_CAPTURED
4. ESCROW_HELD
5. REFUND_REQUESTED
6. PAYMENT_REFUNDED
7. REFUND_COMPLETED
8. ESCROW_RELEASED          ← reversal path
```

### Scenario D — Seller payout after sales

```
1. WALLET_CREDITED          ← from prior sales
2. PAYOUT_REQUESTED
3. PAYOUT_APPROVED
4. WALLET_DEBITED
5. PAYOUT_COMPLETED
```

### Scenario E — COD order (no online payment)

```
(No payment audit timeline — order fulfillment only)
ORDER_PAYMENT_COMPLETED     ← marked COD at checkout
ORDER_DELIVERED
```

*COD flows bypass Payment Engine — no payment audit events.*

---

## 6. Ordering Constraints (Hard Rules)

| Rule | Description |
|------|-------------|
| R1 | `PAYMENT_CREATED` must precede all other payment actions for that `transactionId` |
| R2 | `PAYMENT_CAPTURED` must precede `ESCROW_HELD` |
| R3 | `ESCROW_HELD` must precede `ESCROW_RELEASED` |
| R4 | `ESCROW_RELEASED` must precede `WALLET_CREDITED` (escrow path) |
| R5 | `PAYOUT_APPROVED` must precede `PAYOUT_COMPLETED` |
| R6 | `PAYMENT_REFUNDED` requires prior `PAYMENT_CAPTURED` |
| R7 | Terminal states (`PAYMENT_FAILED`, `PAYMENT_REFUNDED`, `PAYMENT_SETTLED`) accept no further payment transitions without `ADMIN_OVERRIDE` |

These constraints mirror Module 2 `PaymentTransactionStateMachine` — audit timeline must be consistent with transaction state.

---

## 7. Mapping: Legacy Orchestrator Actions → Future Audit Actions

For migration reference (adapter design):

| Legacy (FinancialAuditService) | Future (AuditAction) |
|-------------------------------|----------------------|
| `checkout_started` | `PAYMENT_CREATED` |
| `checkout_completed` | `ORDER_PAYMENT_COMPLETED` |
| `order_transaction_create` | `PAYMENT_CREATED` |
| `order_transaction_authorize` | `PAYMENT_AUTHORIZED` |
| `order_transaction_capture` | `PAYMENT_CAPTURED` |
| `order_transaction_cancel` | `PAYMENT_FAILED` |
| `escrow_hold` | `ESCROW_HELD` |
| `escrow_release` | `ESCROW_RELEASED` |
| `escrow_dispute` | `ADMIN_OVERRIDE` |
| `escrow_refund` | `PAYMENT_REFUNDED` |
| `wallet_credit` | `WALLET_CREDITED` |
| `wallet_debit` | `WALLET_DEBITED` |
| `payout_requested` | `PAYOUT_REQUESTED` |
| `payout_approved` | `PAYOUT_APPROVED` |
| `payout_execute` | `PAYOUT_COMPLETED` |
| `refund_requested` | `REFUND_REQUESTED` |
| `refund_completed` | `REFUND_COMPLETED` |
| `order_settled` / `settlement_orchestrated` | `SETTLEMENT_COMPLETED` |

---

## 8. Event Bus Emission Order (Future)

When Event Bus is introduced (Module 4), domain events should emit **after** audit record for synchronous path, or **in parallel** with async audit subscriber:

```
Transaction state change committed
  → AuditService.record (sync)
  → EventBus.publish (async subscribers)
      → WalletService
      → NotificationService
      → AuditEventSubscriber (for derived events only)
```

Primary lifecycle events are **never** audit-only-via-async — they must have synchronous audit before ACK.

---

## 9. Future Actions to Register

These appear in timelines but are not yet in Module 3 `AuditAction` enum (extensible pattern allows them now; enum update recommended at Module 5):

- `PAYMENT_PENDING`
- `PAYMENT_AUTHORIZED`
- `ORDER_DELIVERED`
- `SETTLEMENT_COMPLETED`
- `REFUND_REQUESTED`
- `REFUND_COMPLETED`
- `PAYOUT_FAILED`

Add to enum when Payment Engine implements each flow — no schema change required.
