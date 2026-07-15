# Provider Idempotency Contract — Module 9 Architecture

**Status:** Design-only. No provider API transmission at Module 9.

---

## Purpose

Define how provider-native idempotency keys are derived and validated **before** Module 10 outbound API integration. This contract complements — does not replace — Module 1 platform idempotency (`MongoIdempotencyService`).

---

## Components

| Component | Role |
|-----------|------|
| `ProviderIdempotencyContract` | `buildKey()`, `validateKey()`, `supportsProviderIdempotency()` |
| `ProviderIdempotencyKey` | Immutable key model + optional metadata envelope |

---

## Responsibilities

### `buildKey(input)`

Derives a deterministic, provider-scoped key from:

- `providerCode`
- `operation`
- `reference`
- optional platform idempotency key (trace/metadata)

Keys are prefixed with `pidem_` and are **not transmitted** at Module 9.

### `validateKey(key)`

Validates key shape, length, and provider ownership. Returns `{ valid, reason? }` — no throws for invalid keys.

### `supportsProviderIdempotency()`

Metadata flag per provider indicating native idempotency header/body support in future modules.

---

## BaseProviderAdapter Exposure

Adapters expose the contract via:

- `adapter.providerIdempotency` — bound contract instance
- `adapter.buildProviderIdempotencyKey(input)`
- `adapter.validateProviderIdempotencyKey(key)`
- `adapter.supportsProviderIdempotency()`
- `adapter.buildProviderIdempotencyMetadata(input)` — optional metadata only

**Existing adapter operations (`charge`, `refund`, etc.) are unchanged** unless callers explicitly merge optional metadata.

---

## Module 10 Expectations

1. Replace `transmitted: false` with actual header/body attachment per provider
2. Coordinate with Module 1 idempotency to avoid double-key conflicts
3. Use `validateKey()` before retrying failed provider calls

---

## Boundaries

- No HTTP requests
- No SDK usage
- No PaymentEngine changes
- No automatic injection into mock adapter responses
