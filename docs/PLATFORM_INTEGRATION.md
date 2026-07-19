# Platform Integration — Phase 9.2

**Tag:** `platform-integration-v1`  
**Baseline:** `growth-platform-completion-v1`  
**Module:** `marketplace/integration/`

Phase 9.2 connects all frozen platforms into one enterprise integration layer without rewriting platform internals.

---

## Integration Layer

| Component | Path | Role |
|-----------|------|------|
| Composition root | `PlatformIntegration.js` | Wires bridges, audit, flags, observability |
| Server repricing | `pricing/OrderPricingService.js` | Reloads catalog prices — client prices ignored |
| Orders ↔ Payments | `bridges/OrderPaymentBridge.js` | Strict `MarketplacePaymentFacade` coordination |
| Orders ↔ Delivery | `bridges/OrderDeliveryBridge.js` | Delivery create + status sync |
| Growth ↔ Payments | `bridges/GrowthSettlementBridge.js` | Unified settlement on delivery |
| Refund lifecycle | `bridges/RefundLifecycleBridge.js` | Payment refund + commission cancel + coupon restore |
| Unified audit | `audit/PlatformAuditService.js` | Actor, action, old/new, reason, correlation |
| Unified RBAC | `auth/PlatformAuthService.js` | Normalized roles across all platforms |
| Unified feature flags | `features/PlatformFeatureFlagService.js` | Central Growth/Delivery/Search/AI/Marketplace flags |
| Observability | `observability/PlatformObservabilityService.js` | Metrics, correlation IDs, health |
| Delivery persistence | `delivery/PersistentDeliveryRepository.js` | Mongo-backed delivery records |

API: `/api/v2/marketplace/integration/health`, `/feature-flags`, `/audit`, `/metrics`

---

## Order Lifecycle

```
Checkout cart (IDs + qty only)
  ↓
OrderPricingService (Product Platform prices)
  ↓
Growth coupon redeem + referral token resolve
  ↓
Order persisted (transaction)
  ↓
OrderPaymentBridge → MarketplacePaymentFacade (fail = rollback)
  ↓
OrderDeliveryBridge → DeliveryPlatform (when enabled)
```

---

## Payment Lifecycle

```
OrderPaymentBridge.prepareOrderPayments
  ↓
OrderTransactionOrchestrator.createOrderTransaction
  ↓
OrderPaymentWorkflow (persisted PaymentRecord)
  ↓
TransactionLedgerService
  ↓
FinancialAuditService

On Delivered:
  capture → SettlementOrchestrator → vendor wallet snapshot
```

Payment failures throw — orders are compensated (inventory restored, order deleted).

---

## Delivery Lifecycle

```
Order created
  ↓
DeliveryPlatform.createDelivery (Mongo persisted)
  ↓
Status CONFIRMED
  ↓
Courier assignment (existing Delivery Platform)
  ↓
Tracking timeline
  ↓
DELIVERED ↔ Order Delivered (status map)
```

---

## Growth Lifecycle

```
Referral token required at order (requireToken)
  ↓
Commission via shared Payments Commission Engine
  ↓
On Delivered: GrowthSettlementBridge
  ↓
Payment settlement + Growth commission approval (single flow)
```

---

## Refund Lifecycle

```
Refund Success
  ↓
RefundOrchestrator (Payment Foundation)
  ↓
Growth cancelOrderCommission
  ↓
Coupon usageCount restored
  ↓
Inventory restored
  ↓
PlatformAuditService
```

---

## Audit Architecture

All platforms write to `PlatformAuditService`:

- `platform`, `actor`, `action`, `oldValue`, `newValue`, `reason`, `timestamp`
- `correlationId`, `orderId`, `transactionId`

Growth/Delivery config stores retain backward-compatible audit for settings changes.

---

## Feature Flag Architecture

`PlatformFeatureFlagService` centralizes domain flags while preserving Growth/Delivery Super Admin stores for backward compatibility.

Domains: `growth`, `delivery`, `search`, `marketplace`, `ai`

---

## RBAC Architecture

`PlatformAuthService` normalizes:

| Role | Normalized value |
|------|------------------|
| Customer | `user` |
| Vendor | `vendor` / seller JWT |
| Courier | `courier` |
| Admin | `admin` (includes legacy `Admin`) |
| Super Admin | `super-admin` |

Used by Growth, Delivery, and integration admin routes.

---

## Security

- `REFERRAL_ATTRIBUTION_SECRET` for HMAC attribution tokens (timing-safe verify)
- `/referral/attribution` requires authentication
- `/api/v2/payment/process` requires authentication
- Server-side totals only — no client price authority

---

## Verification

```bash
npm run test:platform-integration
npm run verify:platform-integration
npm run test:enterprise-certification-remediation
npm run verify:enterprise-certification-remediation
```

**Platform Integration frozen at `platform-integration-v1`.**

---

## Phase 9.2.1 — Enterprise Certification Remediation

**Tag:** `enterprise-certification-remediation-v1`  
**Baseline:** `platform-integration-v1`

### Atomic refund lifecycle

`OrderService.acceptRefund` runs status update, payment refund, growth commission reversal, coupon restore, inventory restore, and audit inside one MongoDB transaction via `RefundLifecycleBridge`.

### Payment ID persistence

`OrderPlatform._persistPaymentIds` stores `paymentInfo.paymentId` after payment sessions. Capture, refund, and settlement require the stored identifier (no synthetic IDs).

### Authoritative order pipeline

Server repricing → promotion validation → coupon validation → tax calculation (`ORDER_TAX_RATE`) → commission base → total → payment → persistence → audit.

### Unified governance

| Service | Role |
|---------|------|
| `PlatformFeatureFlagService` | Runtime authority; Growth/Delivery flag services are adapters |
| `PlatformAuditService` | Runtime authority; financial/AI/config events delegate via `PlatformAuditAdapter` |
| `PlatformAuthService` | Single RBAC authority (`middleware/auth`, `CourierSecurity`, Growth/Delivery) |

### Delivery bidirectional sync

`OrderDeliveryBridge.onDeliveryStatusChanged` updates order status when delivery reaches `DELIVERED`. Optional auto courier assignment when `delivery.autoAssignment.enabled`.

### Commission responsibilities

| Type | Owner |
|------|-------|
| Referral commission | `GrowthCommissionOrchestrator` + Payments Commission Engine |
| Platform fee / vendor settlement | Payments settlement facade |
| Legacy `utils/calculateCommission.js` | Deprecated adapter only |

### Security

- `REFERRAL_ATTRIBUTION_SECRET` mandatory in production/staging
- `/get-coupon-value/:name` requires authentication; validates via Growth Platform (no raw metadata leak)
- Legacy commission share-link delegates to `GrowthPlatform.generateShareLink`

**Enterprise Certification Remediation frozen at `enterprise-certification-remediation-v1`.**
