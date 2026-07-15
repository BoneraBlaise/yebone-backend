# Provider Reference Contract — Module 9 Architecture

**Status:** Design-only. No provider API transmission at Module 9.

---

## Purpose

Normalize cross-provider reference identifiers before Module 10 outbound API integration. Supports reconciliation, settlement tracking, and merchant/customer correlation without altering adapter execution.

---

## Components

| Component | Role |
|-----------|------|
| `ProviderReference` | Immutable reference model with optional fields |
| `ProviderReferenceContract` | `buildReference()`, `validateReference()`, optional metadata |
| `ProviderReferenceInterface` | Adapter exposure contract |

---

## Reference Fields (all optional)

| Field | Description |
|-------|-------------|
| `providerReference` | Provider-assigned transaction/reference id |
| `merchantReference` | Marketplace/order reference |
| `customerReference` | Buyer/customer identifier |
| `settlementReference` | Settlement batch or payout correlation |
| `reconciliationReference` | Reconciliation/reporting correlation |

---

## BaseProviderAdapter Exposure

- `adapter.providerReference` — bound contract instance
- `adapter.buildProviderReference(input)`
- `adapter.validateProviderReference(reference)`
- `adapter.buildProviderReferenceMetadata(input)` — optional metadata only

**Existing adapter operations are unchanged** unless callers explicitly merge reference metadata.

---

## Module 10 Expectations

1. Replace mock `providerReference` values with provider API response ids
2. Attach references to outbound requests and inbound webhook normalization
3. Coordinate with `RECONCILIATION` capability metadata

---

## Boundaries

- No HTTP requests
- No SDK usage
- No PaymentEngine changes
- No automatic injection into mock adapter responses
