# Phase 4A — Core Stabilization

**Baseline:** `payment-foundation-v9`

## Implemented

### Transaction Link Layer

Independent mapping between legacy and Module 2 transaction identifiers.

- `TransactionLinkService` — canonical link operations
- `TransactionLinkRepository` — in-memory persistence (Mongo-ready model)
- Bidirectional lookup by legacy id, module2 id, provider reference, payment reference, order id, correlation id

Repositories are **not merged**. The link layer stores references only.

### Payment Charge Router

- `PaymentChargeRouter` routes `createOrderPayment` through `LegacyPaymentRoutingPolicy`
- Policy **disabled (default):** always legacy — no behaviour change
- Policy **enabled:** per-provider foundation routing when provider is in `foundationChargeProviders`
- Legacy charges automatically create Module 2 transaction + link when foundation engine is composed

### Unified Correlation

- `TransactionCorrelationPolicy.fromChargeRequest()` — correlation begins at charge creation
- Webhook reconciliation prefers charge-time `correlationId` from `TransactionLinkService` when link exists
- Same correlationId flows through link → webhook → events → audit → logs

## Activation

Linking and charge router are wired when `composePaymentFoundation=true`.

Routing policy remains inactive until `PAYMENT_LEGACY_ROUTING_POLICY=true`.

## Rollback

Disable foundation compose or routing policy env vars — system reverts to v9 behaviour.
