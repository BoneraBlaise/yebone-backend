# Module 7 Part B — Wallet Foundation

**Version:** `7.0.0-foundation`  
**Status:** Foundation only — not wired into production.

Wallet is a read model over the ledger. Ledger remains the single source of truth.

## Wallet Types

| Type | Ledger Account |
|------|----------------|
| SELLER | VENDOR_PAYABLE |
| PLATFORM | PLATFORM_REVENUE |
| REFERRAL | REFERRAL_COMMISSION |
| RESERVE | REFUND_RESERVE |
| PENDING_PAYOUT | VENDOR_PAYABLE |

## States

ACTIVE | FROZEN | SUSPENDED | CLOSED

No persistence. No MongoDB wiring.
