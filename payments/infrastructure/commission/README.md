# Module 7 Part A — Commission Engine Foundation

**Version:** `7.0.0-foundation`  
**Status:** Foundation only — not wired into production.

Configurable commission resolution and calculation. Produces balanced ledger journals via `CommissionDistribution` without modifying the ledger module.

## Strategy Resolution

Base commission (first match wins):

1. Campaign
2. Vendor
3. Category
4. Subscription
5. Global

Referral is **additive** — applied on top of base commission.

## Breakdown

| Field | Description |
|-------|-------------|
| `grossAmount` | Order total |
| `platformCommission` | Base platform cut |
| `referralCommission` | Additive referral cut |
| `tax` | Configurable tax rule |
| `netSellerAmount` | Seller net |
| `platformRevenue` | Platform revenue |

## Usage

```javascript
const { createCommissionEngine } = require("./payments/infrastructure/commission");
const { createLedgerFoundation } = require("./payments/infrastructure/ledger");

const commission = createCommissionEngine({
  rules: [
    { strategy: "GLOBAL", rate: 10, rateType: "PERCENTAGE" },
    { strategy: "VENDOR", rate: 12, scope: { vendorId: "v-1" } },
    { strategy: "REFERRAL", rate: 2, scope: { referrerId: "ref-1" } },
  ],
});

const ledger = createLedgerFoundation();

// Fund escrow first, then post commission release
const result = commission.engine.postEscrowRelease(
  { grossAmount: 10000, vendorId: "v-1", referrerId: "ref-1" },
  ledger,
  { journalId: "release-1", reference: "order-1" }
);
```

No percentages are hardcoded — all rates come from registered rules.
