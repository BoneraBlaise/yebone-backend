# Module 10 — Provider Runtime (Phase 1)

Sandbox-first provider integration infrastructure. **Not wired to PaymentModule.**

## Components

| Component | Role |
|-----------|------|
| `ProviderHttpClient` | Injectable HTTP transport; live network blocked by default |
| `ProviderRequestSigner` | Subscription keys, bearer tokens, idempotency/correlation headers |
| `ProviderAuthentication` | Credential loading + token cache orchestration |
| `ProviderCredentialStore` | Aggregates env / secret-manager / vault providers |
| `ProviderRetryPolicy` | Idempotent-safe retries (OAuth, status) |
| `ProviderTimeoutPolicy` | Per-operation timeout resolution |
| `ProviderErrorMapper` | Maps runtime errors → `ProviderError` |
| `ProviderResponseNormalizer` | Normalizes payloads → `ProviderResponse` |
| `ProviderWebhookVerifier` | HMAC webhook verification architecture |
| `ProviderSandboxConfig` | Sandbox endpoint registry |
| `ProviderEnvironmentResolver` | Sandbox-only environment resolution |
| `RuntimeAdapterContractSurface` | Shared Module 9 contract delegation for runtime adapters |

## Providers

- **MTN MoMo** — OAuth, API User/Key, Collection, Disbursement
- **Paypack** — Authentication, normalization, error mapping (no production calls)

## MTN MoMo OAuth

Collection and Disbursement use **separate sandbox token endpoints** and **separate cache scopes**:

| Product | OAuth path | Cache scope |
|---------|------------|-------------|
| Collection | `/collection/token/` | `collection` |
| Disbursement | `/disbursement/token/` | `disbursement` |

`MTNMoMoOAuthClient.acquireToken(scope)` resolves the endpoint from scope. Tokens are never shared across scopes.

## Runtime Contract Parity

Runtime adapters (`MTNMoMoRuntimeAdapter`, `PaypackRuntimeAdapter`) expose the same Module 9 contract surface as skeleton adapters via `RuntimeAdapterContractSurface`:

- `ProviderAdapterInterface` — charge, verify, refund, payout, webhook, health
- `ProviderReferenceContract` — via `providerReference` and reference helper methods
- `ProviderIdempotencyContract` — via `providerIdempotency` and idempotency helper methods
- `WebhookVerificationContract` — via `verifyWebhook()` / `verifySignature()` delegating to `ProviderWebhookVerifier`

No contract logic is duplicated — runtime adapters delegate to existing Module 9 contracts.

## Future Registry Integration (Phase 2+)

Runtime adapters are **not** registered in `ProviderAdapterRegistry` at Phase 1. Phase 2 will:

1. Introduce a runtime-aware resolver path (parallel to Module 9 skeleton registry)
2. Apply feature gates and capability validation before routing to runtime adapters
3. Keep skeleton adapters as mock fallback until runtime is explicitly enabled per provider

## Contracts (Module 9 — unchanged)

All runtime adapters reuse:

- `ProviderReferenceContract`
- `ProviderIdempotencyContract`
- `WebhookVerificationContract` (via `ProviderWebhookVerifier`)

## Security

Credentials loaded via `EnvironmentCredentialProvider` (env vars). Stubs exist for secret manager and vault backends. **No secrets in repository.**

## Testing

```bash
npm run test:providers:runtime
```

Mock HTTP transport only — no live network calls.

## Constraints

- Do NOT wire to `PaymentModule`, routes, `app.js`, or `server.js`
- Do NOT enable feature flags
- Do NOT merge to main or deploy
