const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const RuntimeExecutionGuard = require("../RuntimeExecutionGuard");
const RuntimeFeatureFlagRegistry = require("../RuntimeFeatureFlagRegistry");
const ProviderEnvironmentResolver = require("../ProviderEnvironmentResolver");
const RuntimeExecutionGuardError = require("../errors/RuntimeExecutionGuardError");

describe("RuntimeExecutionGuard", () => {
  const environmentResolver = new ProviderEnvironmentResolver();

  it("assertEnvironment allows sandbox only", () => {
    const guard = new RuntimeExecutionGuard({ environmentResolver });
    assert.doesNotThrow(() => guard.assertEnvironment("sandbox"));
    assert.throws(() => guard.assertEnvironment("production"), RuntimeExecutionGuardError);
  });

  it("assertExecutionAllowed blocks live execution", () => {
    const guard = new RuntimeExecutionGuard({ environmentResolver });
    assert.doesNotThrow(() => guard.assertExecutionAllowed());
    assert.throws(
      () => guard.assertExecutionAllowed({ liveExecutionEnabled: true }),
      /live execution path is blocked/
    );
  });

  it("assertRuntimeEnabled requires master and provider runtime flags", () => {
    const runtimeFeatureFlags = new RuntimeFeatureFlagRegistry();
    const guard = new RuntimeExecutionGuard({ runtimeFeatureFlags, environmentResolver });

    assert.throws(() => guard.assertRuntimeEnabled("MTN_MOMO"), /runtime sandbox is disabled/);

    runtimeFeatureFlags.enable("runtimeSandboxEnabled");
    assert.throws(
      () => guard.assertRuntimeEnabled("MTN_MOMO"),
      /provider runtime disabled/
    );

    runtimeFeatureFlags.enable("mtnRuntimeEnabled");
    assert.doesNotThrow(() => guard.assertRuntimeEnabled("MTN_MOMO"));
  });

  it("assertSandbox validates resolved sandbox environment", () => {
    const guard = new RuntimeExecutionGuard({ environmentResolver });
    const resolved = environmentResolver.resolve("MTN_MOMO", "sandbox");
    assert.doesNotThrow(() => guard.assertSandbox("MTN_MOMO", resolved));
  });

  it("assertSandbox rejects mismatched baseUrl", () => {
    const guard = new RuntimeExecutionGuard({ environmentResolver });
    assert.throws(
      () =>
        guard.assertSandbox("MTN_MOMO", {
          environment: "sandbox",
          liveExecutionEnabled: false,
          baseUrl: "https://production.example.com",
        }),
      /baseUrl does not match/
    );
  });

  it("assertSandbox rejects live execution in resolved environment", () => {
    const guard = new RuntimeExecutionGuard({ environmentResolver });
    assert.throws(
      () =>
        guard.assertSandbox("MTN_MOMO", {
          environment: "sandbox",
          liveExecutionEnabled: true,
          baseUrl: "https://sandbox.momodeveloper.mtn.com",
        }),
      /live execution enabled/
    );
  });

  it("assertLiveExecutionPrevented blocks PAYMENT_RUNTIME_LIVE env flag", () => {
    const guard = new RuntimeExecutionGuard({
      environmentResolver,
      env: { PAYMENT_RUNTIME_LIVE: "true" },
    });
    assert.throws(() => guard.assertLiveExecutionPrevented(), /PAYMENT_RUNTIME_LIVE=true is blocked/);
  });

  it("assertCredentials validates MTN and Paypack credential shapes", () => {
    const guard = new RuntimeExecutionGuard({ environmentResolver });

    assert.throws(
      () => guard.assertCredentials({ found: false, providerCode: "MTN_MOMO" }),
      /credentials not found/
    );

    assert.doesNotThrow(() =>
      guard.assertCredentials({
        found: true,
        providerCode: "MTN_MOMO",
        credentials: {
          collection: {
            subscriptionKey: "sub",
            apiUser: "user",
            apiKey: "key",
          },
        },
      })
    );

    assert.doesNotThrow(() =>
      guard.assertCredentials({
        found: true,
        providerCode: "PAYPACK",
        credentials: {
          default: { clientId: "id", clientSecret: "secret" },
        },
      })
    );
  });

  it("assertFeatureFlags delegates to assertRuntimeEnabled", () => {
    const runtimeFeatureFlags = new RuntimeFeatureFlagRegistry();
    runtimeFeatureFlags.enable("runtimeSandboxEnabled");
    runtimeFeatureFlags.enable("paypackRuntimeEnabled");
    const guard = new RuntimeExecutionGuard({ runtimeFeatureFlags, environmentResolver });
    assert.doesNotThrow(() => guard.assertFeatureFlags("PAYPACK"));
  });
});
