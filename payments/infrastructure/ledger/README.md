# Module 6 — Double-Entry Accounting Ledger Foundation

**Version:** `6.0.0-foundation`  
**Status:** Foundation only — not wired into production.

The ledger is the **single source of truth** for all money. Wallets, balances, payouts, commissions, escrow, and reports must eventually derive from posted journal entries.

## Scope

| In scope | Out of scope |
|----------|--------------|
| Double-entry journal posting | Wallet implementation |
| Chart of accounts | Provider integration |
| Balance calculations (read-only) | PaymentModule wiring |
| Reversal entries | MongoDB persistence |
| Health contract | Commission percentages |

## Architecture

```
LedgerEngine
├── ChartOfAccounts      (account registry)
├── LedgerPostingEngine  (validate + post immutable entries)
├── LedgerBalanceCalculator (derive balances from entries)
└── LedgerHealthContract (self-diagnostic)
```

## Double-Entry Rules

Every journal must balance:

```
Σ debits === Σ credits
```

Unbalanced journals throw `UnbalancedJournalError`. Entries are **immutable** — corrections use reversing journals only.

## Commission Design (Architecture Only)

Future `CommissionEngine` will resolve rules without hardcoded percentages:

- `CommissionRules` — vendor %, category %, campaign, subscription, country, date-range
- Ledger accounts `PLATFORM_COMMISSION`, `REFERRAL_COMMISSION` are ready to receive postings
- Commission resolution produces balanced journals posted via `LedgerPostingEngine`

## Escrow Flow

```
Buyer pays
  → DR Customer Clearing / CR Settlement Account (provider)
  → DR Settlement Account / CR Marketplace Escrow
Order fulfilled
  → DR Marketplace Escrow / CR Vendor Payable + CR Platform Revenue
```

## Refund Flow

Never edit entries. Refunds create reversing journals:

```
Original: DR Escrow / CR Vendor Payable
Reversal: DR Vendor Payable / CR Escrow
```

## Usage

```javascript
const { createLedgerFoundation } = require("./payments/infrastructure/ledger");

const { engine, chartOfAccounts } = createLedgerFoundation();

const cash = chartOfAccounts.getByCode("CASH");
const escrow = chartOfAccounts.getByCode("MARKETPLACE_ESCROW");

engine.post({
  description: "Buyer payment",
  reference: "order-123",
  correlationId: "corr-abc",
  entries: [
    { accountId: cash.id, debit: 10000, credit: 0 },
    { accountId: escrow.id, debit: 0, credit: 10000 },
  ],
});

engine.trialBalance();
engine.health();
```

## Factory

`createLedgerFoundation(options)` wires all components via DI. Not auto-wired into `PaymentModule`.

## Health Contract

`ledger.health()` returns:

```json
{
  "healthy": true,
  "accounts": 16,
  "journals": 0,
  "entries": 0,
  "balanced": true,
  "version": "6.0.0-foundation",
  "checkedAt": "..."
}
```

## Tests

```bash
npm run test:ledger:all
```
