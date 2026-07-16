const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const RuntimeAdapterRegistry = require("../RuntimeAdapterRegistry");
const RuntimeAdapterResolver = require("../RuntimeAdapterResolver");
const RuntimeFeatureFlagRegistry = require("../RuntimeFeatureFlagRegistry");
const {
  createCombinedFoundation,
  createMockRuntimeAdapter,
  enableMtnRuntime,
} = require("./runtimeTestHelpers");

describe("RuntimeAdapterResolver", () => {
  it("selects MOCK when provider feature flag is disabled", () => {
    const foundation = createCombinedFoundation();
    foundation.providerRegistry.enable("MTN_MOMO");

    const decision = foundation.runtimeAdapterResolver.resolve({ providerCode: "MTN_MOMO" });
    assert.equal(decision.executionMode, "MOCK");
    assert.equal(decision.reason, "providerFlagDisabled");
    assert.equal(decision.fallbackAllowed, true);
    assert.ok(decision.adapter);
  });

  it("selects MOCK when registry entry is disabled", () => {
    const foundation = createCombinedFoundation();
    foundation.featureFlags.enable("mtnEnabled");

    const decision = foundation.runtimeAdapterResolver.resolve({ providerCode: "MTN_MOMO" });
    assert.equal(decision.executionMode, "MOCK");
    assert.equal(decision.reason, "registryDisabled");
  });

  it("selects MOCK when runtime sandbox flag is disabled", () => {
    const foundation = enableMtnRuntime(createCombinedFoundation());
    foundation.runtimeFeatureFlags.disable("runtimeSandboxEnabled");

    const decision = foundation.runtimeAdapterResolver.resolve({ providerCode: "MTN_MOMO" });
    assert.equal(decision.executionMode, "MOCK");
    assert.equal(decision.reason, "runtimeSandboxDisabled");
  });

  it("selects MOCK when provider runtime flag is disabled", () => {
    const foundation = enableMtnRuntime(createCombinedFoundation());
    foundation.runtimeFeatureFlags.disable("mtnRuntimeEnabled");

    const decision = foundation.runtimeAdapterResolver.resolve({ providerCode: "MTN_MOMO" });
    assert.equal(decision.executionMode, "MOCK");
    assert.equal(decision.reason, "providerRuntimeDisabled");
  });

  it("selects MOCK when runtime adapter is not registered", () => {
    const foundation = enableMtnRuntime(createCombinedFoundation());
    foundation.runtimeAdapterRegistry.unregister("MTN_MOMO");

    const decision = foundation.runtimeAdapterResolver.resolve({ providerCode: "MTN_MOMO" });
    assert.equal(decision.executionMode, "MOCK");
    assert.equal(decision.reason, "runtimeNotRegistered");
  });

  it("selects MOCK when environment is not sandbox", () => {
    const foundation = enableMtnRuntime(createCombinedFoundation());
    const decision = foundation.runtimeAdapterResolver.resolve({
      providerCode: "MTN_MOMO",
      environment: "production",
    });
    assert.equal(decision.executionMode, "MOCK");
    assert.equal(decision.reason, "environmentNotSandbox");
  });

  it("selects RUNTIME_SANDBOX when all gates pass", () => {
    const foundation = enableMtnRuntime(createCombinedFoundation());
    const decision = foundation.runtimeAdapterResolver.resolve({ providerCode: "MTN_MOMO" });

    assert.equal(decision.executionMode, "RUNTIME_SANDBOX");
    assert.equal(decision.reason, "runtimeEnabled");
    assert.equal(decision.fallbackAllowed, false);
    assert.equal(decision.adapter, foundation.runtime.mtnMoMo);
  });

  it("follows precedence — provider flag before runtime flags", () => {
    const foundation = enableMtnRuntime(createCombinedFoundation());
    foundation.featureFlags.disable("mtnEnabled");

    const decision = foundation.runtimeAdapterResolver.resolve({ providerCode: "MTN_MOMO" });
    assert.equal(decision.reason, "providerFlagDisabled");
  });

  it("does not execute HTTP or provider operations", () => {
    const foundation = enableMtnRuntime(createCombinedFoundation());
    const adapter = foundation.runtime.mtnMoMo;
    let chargeCalled = false;
    adapter.charge = async () => {
      chargeCalled = true;
    };

    foundation.runtimeAdapterResolver.resolve({ providerCode: "MTN_MOMO" });
    assert.equal(chargeCalled, false);
  });

  it("supports custom runtime registry entries", () => {
    const foundation = createCombinedFoundation();
    foundation.providerRegistry.enable("MTN_MOMO");
    foundation.featureFlags.enable("mtnEnabled");
    foundation.runtimeFeatureFlags.enable("runtimeSandboxEnabled");
    foundation.runtimeFeatureFlags.enable("mtnRuntimeEnabled");

    const mockAdapter = createMockRuntimeAdapter("MTN_MOMO");
    foundation.runtimeAdapterRegistry.register("MTN_MOMO", mockAdapter, { enabled: true });

    const decision = foundation.runtimeAdapterResolver.resolve({ providerCode: "MTN_MOMO" });
    assert.equal(decision.executionMode, "RUNTIME_SANDBOX");
    assert.equal(decision.adapter, mockAdapter);
  });

  it("returns fallbackDefault when provider descriptor is missing from registry", () => {
    const foundation = createCombinedFoundation();

    assert.doesNotThrow(() => {
      const decision = foundation.runtimeAdapterResolver.resolve({
        providerCode: "NOT_REGISTERED_PROVIDER",
      });

      assert.equal(decision.executionMode, "MOCK");
      assert.equal(decision.providerCode, "NOT_REGISTERED_PROVIDER");
      assert.equal(decision.reason, "fallbackDefault");
      assert.equal(decision.fallbackAllowed, true);
      assert.equal(decision.adapter, null);
      assert.equal(decision.descriptor.code, "NOT_REGISTERED_PROVIDER");
      assert.equal(Object.isFrozen(decision), true);
    });
  });

  it("returns deterministic MOCK for empty providerCode", () => {
    const foundation = createCombinedFoundation();
    const decision = foundation.runtimeAdapterResolver.resolve({ providerCode: "" });

    assert.equal(decision.executionMode, "MOCK");
    assert.equal(decision.providerCode, "UNKNOWN");
    assert.equal(decision.reason, "fallbackDefault");
    assert.equal(decision.fallbackAllowed, true);
    assert.equal(decision.adapter, null);
    assert.equal(Object.isFrozen(decision), true);
    assert.equal(Object.isFrozen(decision.descriptor), true);
  });

  it("returns deterministic MOCK for undefined providerCode", () => {
    const foundation = createCombinedFoundation();
    const decision = foundation.runtimeAdapterResolver.resolve({ providerCode: undefined });

    assert.equal(decision.executionMode, "MOCK");
    assert.equal(decision.providerCode, "UNKNOWN");
    assert.equal(decision.reason, "fallbackDefault");
    assert.equal(decision.fallbackAllowed, true);
    assert.equal(Object.isFrozen(decision), true);
  });

  it("selects MOCK with providerRuntimeDisabled for unsupported provider without runtime flag", () => {
    const foundation = createCombinedFoundation();
    foundation.providerRegistry.enable("STRIPE");
    foundation.featureFlags.enable("stripeEnabled");
    foundation.runtimeFeatureFlags.enable("runtimeSandboxEnabled");

    const decision = foundation.runtimeAdapterResolver.resolve({ providerCode: "STRIPE" });

    assert.equal(decision.executionMode, "MOCK");
    assert.equal(decision.reason, "providerRuntimeDisabled");
    assert.equal(decision.fallbackAllowed, true);
    assert.equal(decision.providerCode, "STRIPE");
    assert.equal(foundation.runtimeAdapterRegistry.has("STRIPE"), false);
  });

  it("selects MOCK with runtimeNotRegistered when runtime adapter is missing for supported provider", () => {
    const foundation = enableMtnRuntime(createCombinedFoundation());
    foundation.runtimeAdapterRegistry.unregister("MTN_MOMO");

    const decision = foundation.runtimeAdapterResolver.resolve({ providerCode: "MTN_MOMO" });

    assert.equal(decision.executionMode, "MOCK");
    assert.equal(decision.reason, "runtimeNotRegistered");
    assert.equal(decision.fallbackAllowed, true);
    assert.notEqual(decision.executionMode, "RUNTIME_SANDBOX");
  });

  it("falls back to MOCK when environmentResolver throws without uncaught exception", () => {
    const foundation = enableMtnRuntime(createCombinedFoundation());
    const resolver = new RuntimeAdapterResolver({
      runtimeAdapterRegistry: foundation.runtimeAdapterRegistry,
      runtimeFeatureFlags: foundation.runtimeFeatureFlags,
      featureFlags: foundation.featureFlags,
      providerRegistry: foundation.providerRegistry,
      skeletonAdapterRegistry: foundation.adapterRegistry,
      environmentResolver: {
        resolve() {
          throw new Error("sandbox config missing");
        },
      },
    });

    assert.doesNotThrow(() => {
      const decision = resolver.resolve({ providerCode: "MTN_MOMO", environment: "sandbox" });
      assert.equal(decision.executionMode, "MOCK");
      assert.equal(decision.reason, "environmentNotSandbox");
      assert.equal(decision.fallbackAllowed, true);
      assert.equal(decision.providerCode, "MTN_MOMO");
    });
  });
});

describe("RuntimeFeatureFlagRegistry", () => {
  it("defaults runtime flags to OFF", () => {
    const flags = new RuntimeFeatureFlagRegistry();
    assert.equal(flags.isEnabled("runtimeSandboxEnabled"), false);
    assert.equal(flags.isEnabled("mtnRuntimeEnabled"), false);
    assert.equal(flags.isEnabled("paypackRuntimeEnabled"), false);
  });

  it("does not affect Module 4 feature flags", () => {
    const foundation = createCombinedFoundation();
    assert.equal(foundation.featureFlags.isEnabled("mtnEnabled"), false);
    foundation.runtimeFeatureFlags.enable("mtnRuntimeEnabled");
    assert.equal(foundation.featureFlags.isEnabled("mtnEnabled"), false);
  });

  it("requires both master and provider flags for isProviderRuntimeEnabled", () => {
    const flags = new RuntimeFeatureFlagRegistry();
    flags.enable("mtnRuntimeEnabled");
    assert.equal(flags.isProviderRuntimeEnabled("MTN_MOMO"), false);
    flags.enable("runtimeSandboxEnabled");
    assert.equal(flags.isProviderRuntimeEnabled("MTN_MOMO"), true);
  });
});
