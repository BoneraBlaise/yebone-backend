# Trust & Buyer Protection (Phase 14)

**Tag:** `trust-buyer-protection-v1`  
**Baseline:** `property-mobility-v1` + `yebo-ai-commerce-agent-v1`  
**API base:** `/api/v2/marketplace/trust-buyer-protection`

---

## Overview

Phase 14 introduces trust, verification, and buyer protection without modifying frozen payment, order, or commerce-agent cores. The domain extends the marketplace through bridges, platform registration, and read-only AI tools.

**Out of scope (Phase 15):** inbox, chat, offers, negotiation, commissions, affiliate, notifications, push, admin broadcasts.

---

## Module layout

```
marketplace/trust-buyer-protection/
├── TrustBuyerProtectionPlatform.js
├── TrustBuyerProtectionRepository.js
├── TrustBuyerProtectionConfigStore.js
├── TrustBuyerProtectionAccess.js
├── TrustBuyerProtectionHealth.js
├── TrustBuyerProtectionSettingsDefaults.js
├── index.js
├── bridges/
│   ├── TrustOrdersBridge.js      # read-only order access
│   └── TrustPaymentBridge.js     # escrow via Payment Foundation facade
├── services/
│   ├── BuyerProtectionService.js
│   ├── DisputeService.js
│   ├── DisputeStateMachine.js
│   ├── EscrowService.js
│   ├── EscrowStateMachine.js
│   ├── VerificationService.js
│   ├── TrustScoreService.js
│   ├── FraudDetectionService.js
│   ├── PolicyService.js
│   └── AnalyticsService.js
└── ai/                           # read-only tools only
    ├── TrustProtectionExplainTool.js
    ├── DisputeStatusTool.js
    ├── VerificationExplainTool.js
    ├── TrustScoreExplainTool.js
    └── RefundEligibilityTool.js
```

---

## Capabilities

| Domain | Features |
|--------|----------|
| Buyer Protection | Eligibility, lifecycle, expiration, history |
| Disputes | State machine: OPEN → … → CLOSED/REFUNDED/REJECTED |
| Escrow | PENDING → FUNDS_HELD → … → RELEASED/REFUNDED |
| Verification | Customer, vendor, agency — Identity, Phone, Email, Business, Address, National ID |
| Trust Score | 0–100 from configurable weights (no hardcoded formula) |
| Fraud | Risk levels LOW–CRITICAL; admin review only (no auto-ban) |
| Policies | Central config: duration, claim period, categories, refund rules, escrow delay |

---

## Reuse (frozen modules)

| Module | Integration |
|--------|-------------|
| Orders | `TrustOrdersBridge` — read/ownership only |
| Payments | `TrustPaymentBridge` → `MarketplacePaymentFacade.escrow()` |
| Audit | `PlatformAuditAdapter` with `platform: "buyerProtection"` |
| AI (Phase 13) | Extended via `registerTools.js` — read-only trust tools |

---

## Admin UI

| Route | Purpose |
|-------|---------|
| `/admin/trust` | Disputes, Escrow, Verification, Trust Scores, Fraud, Policies, Analytics |

---

## AI (read-only)

Trust intents detected in `AIPlanner.detectIntent()`:

- Dispute status → `trust.dispute.status`
- Protection explain → `trust.protection.explain`
- Verification explain → `trust.verification.explain`
- Trust score → `trust.score.explain`
- Refund eligibility → `trust.refund.eligibility`

**AI never approves refunds, verification, or escrow release.**

---

## Verification

```bash
npm run test:trust-buyer-protection
npm run verify:trust-buyer-protection
npm run verify:local   # from workspace root
```

---

## Status

**FROZEN** at `trust-buyer-protection-v1`. Do not extend Phase 14 scope — Phase 15 is separate.
