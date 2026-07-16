# Module 10 — Phase 2 Backlog

Runtime infrastructure follow-up after Phase 1 freeze. **Not started.**

---

## Runtime Infrastructure

- Rename `MTNMoMoTokenCache` → `ProviderTokenCache` (or `OAuthTokenCache`)
- Introduce shared `ProviderTokenCache` used by all providers
- Improve runtime composition in `RuntimeFactory` (shared credential store / HTTP client instances)

---

## MTN MoMo

- Separate Collection credentials (subscription key, API user, API key per product)
- Separate Disbursement credentials
- MTN Refund implementation
- MTN Sandbox validation against live sandbox API
- MTN Production validation (gated, explicit approval only)

---

## Paypack

- Checkout implementation
- Cash-in
- Verify payment
- Refund support (if available)

---

## Runtime Registration

- Runtime Adapter Registry (parallel to Module 9 skeleton registry)
- Runtime Resolver (providerCode / country / currency routing)
- Runtime Feature Gates (align with `FeatureFlagRegistry`)
- Runtime Bootstrap (composition root wiring, still not PaymentModule)

---

## Security

- Secret Manager implementation (`SecretManagerCredentialProvider`)
- Vault implementation (`VaultCredentialProvider`)
- Credential rotation support
- Live execution guard (env-level enforcement beyond factory override)

---

## HTTP

- AbortController support for timeout cancellation
- Better timeout cancellation (abort in-flight transport)
- Connection pooling
- Metrics (latency, status codes, retry counts)

---

## Observability

- Runtime tracing
- Metrics per provider / operation
- Structured logging (no credential leakage)
- Correlation diagnostics

---

## Webhooks

- Production verification (provider-specific algorithms)
- Timestamp tolerance
- Replay protection

---

## Production

- Provider sandbox validation (manual + automated)
- Production environment support in `ProviderEnvironmentResolver`
- Production credential validation
- Controlled rollout per provider feature flag
