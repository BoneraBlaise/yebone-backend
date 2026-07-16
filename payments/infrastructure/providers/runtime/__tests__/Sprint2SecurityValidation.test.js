const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const RuntimeExecutionGuard = require("../RuntimeExecutionGuard");
const RuntimeFeatureFlagRegistry = require("../RuntimeFeatureFlagRegistry");
const ProviderEnvironmentResolver = require("../ProviderEnvironmentResolver");
const AuthorizationRedactor = require("../security/AuthorizationRedactor");
const SecretRedactor = require("../security/SecretRedactor");
const { SecretManagerProvider } = require("../credentials/SecretManagerProvider");
const { VaultProvider } = require("../credentials/VaultProvider");
const CredentialRefreshService = require("../credentials/CredentialRefreshService");
const EnvironmentCredentialProvider = require("../credentials/EnvironmentCredentialProvider");
const ProviderCredentialStore = require("../ProviderCredentialStore");
const RuntimeConfig = require("../RuntimeConfig");

describe("Sprint 2 security validation", () => {
  const environmentResolver = new ProviderEnvironmentResolver();

  it("blocks live execution via RuntimeExecutionGuard", () => {
    const guard = new RuntimeExecutionGuard({ environmentResolver });
    assert.throws(() => guard.assertExecutionAllowed({ liveExecutionEnabled: true }));
    assert.throws(() => guard.assertLiveExecutionPrevented({ env: { PAYMENT_RUNTIME_LIVE: "true" } }));
  });

  it("enforces sandbox-only environment resolution", () => {
    const guard = new RuntimeExecutionGuard({ environmentResolver });
    const resolved = environmentResolver.resolve("MTN_MOMO", "sandbox");
    assert.doesNotThrow(() => guard.assertSandbox("MTN_MOMO", resolved));
    assert.equal(resolved.liveExecutionEnabled, false);
  });

  it("redacts authorization and secret fields", () => {
    const headers = AuthorizationRedactor.redactHeaders({
      Authorization: "Bearer secret-token",
      "X-Custom": "visible",
    });
    assert.equal(headers.Authorization, "[REDACTED]");
    assert.equal(headers["X-Custom"], "visible");

    const diagnostics = SecretRedactor.redactDiagnostics({
      correlationId: "corr-1",
      counters: { provider_success: 1 },
      metadata: { apiKey: "super-secret" },
    });
    assert.equal(diagnostics.metadata.apiKey, "[REDACTED]");
  });

  it("resolves product-scoped MTN credentials", async () => {
    const store = new ProviderCredentialStore([
      new EnvironmentCredentialProvider({
        env: {
          MTN_MOMO_COLLECTION_SUBSCRIPTION_KEY: "col-sub",
          MTN_MOMO_COLLECTION_API_USER: "col-user",
          MTN_MOMO_COLLECTION_API_KEY: "col-key",
          MTN_MOMO_DISBURSEMENT_SUBSCRIPTION_KEY: "disb-sub",
          MTN_MOMO_DISBURSEMENT_API_USER: "disb-user",
          MTN_MOMO_DISBURSEMENT_API_KEY: "disb-key",
        },
      }),
    ]);
    const result = await store.load("MTN_MOMO");
    assert.equal(result.found, true);
    assert.equal(result.credentials.collection.subscriptionKey, "col-sub");
    assert.equal(result.credentials.disbursement.subscriptionKey, "disb-sub");
  });

  it("exposes SecretManager and Vault provider contracts", async () => {
    const secretManager = new SecretManagerProvider();
    const vault = new VaultProvider();
    assert.equal(typeof secretManager.load, "function");
    assert.equal(typeof vault.load, "function");
  });

  it("supports credential refresh metadata attachment", async () => {
    const store = new ProviderCredentialStore([
      new EnvironmentCredentialProvider({
        env: { PAYPACK_CLIENT_ID: "id", PAYPACK_CLIENT_SECRET: "secret" },
      }),
    ]);
    const refresh = new CredentialRefreshService({ credentialStore: store });
    const refreshed = await refresh.refresh("PAYPACK");
    assert.equal(refreshed.found, true);
  });

  it("keeps runtime feature flags default OFF", () => {
    const flags = new RuntimeFeatureFlagRegistry();
    assert.equal(flags.isEnabled("runtimeSandboxEnabled"), false);
    assert.equal(flags.isEnabled("mtnRuntimeEnabled"), false);
    assert.equal(RuntimeConfig.liveExecutionEnabled, false);
  });
});
