# Commission Architecture (Module 6 — Design Only)

**Status:** Architecture verification — `CommissionEngine` not implemented.

The ledger supports all commission types via balanced multi-line journals. No percentages are hardcoded. A future `CommissionEngine` resolves rules and produces journal entry lines; `LedgerPostingEngine` validates and posts them.

## Supported Commission Types

| Type | Resolution Input (future) | Ledger Accounts |
|------|---------------------------|-----------------|
| Global commission | Platform default rule | `PLATFORM_COMMISSION`, `PLATFORM_REVENUE` |
| Vendor commission | `sellerId` / vendor rule | `PLATFORM_COMMISSION`, `VENDOR_PAYABLE` |
| Category commission | Category ID in metadata | `PLATFORM_COMMISSION`, `VENDOR_PAYABLE` |
| Campaign commission | Campaign ID in metadata | `PLATFORM_COMMISSION`, `PROMOTIONAL_CREDITS` |
| Referral commission | Referrer ID in metadata | `REFERRAL_COMMISSION`, `AFFILIATE_COMMISSION_PAYABLE` |
| Subscription commission | Subscription tier rule | `PLATFORM_COMMISSION`, `PLATFORM_REVENUE` |

## Example: Escrow Release with Multi-Commission Split

Order total: 10,000 — resolved by `CommissionEngine` (future), posted as one balanced journal:

```
DR  MARKETPLACE_ESCROW           10,000
CR  VENDOR_PAYABLE                         7,500   (vendor net)
CR  PLATFORM_COMMISSION                    1,200   (global + vendor rule)
CR  REFERRAL_COMMISSION                      200   (referral)
CR  AFFILIATE_COMMISSION_PAYABLE              100   (affiliate payable)
```

Σ debits = Σ credits = 10,000

## Metadata for Rule Resolution

Journal optional metadata supports future analytics without schema changes:

- `tenantId`, `shopId`, `sellerId`, `buyerId`
- `providerCode`, `paymentMethod`
- Custom keys in `metadata` (e.g. `categoryId`, `campaignId`, `subscriptionTier`)

## Verification

No ledger modification required when `CommissionEngine` is added. Engine produces entry lines; posting rules unchanged.
