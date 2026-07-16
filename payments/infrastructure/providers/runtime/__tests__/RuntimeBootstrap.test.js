const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const { createRuntimeFoundation } = require("../RuntimeBootstrap");
const RuntimeAdapterResolver = require("../RuntimeAdapterResolver");
const { createCombinedFoundation } = require("./runtimeTestHelpers");

describe("RuntimeBootstrap", () => {
  it("creates runtime factory bundle and registry without provider wiring", () => {
    const foundation = createRuntimeFoundation({ registerDefaults: true });

    assert.ok(foundation.runtime);
    assert.ok(foundation.runtime.mtnMoMo);
    assert.ok(foundation.runtime.paypack);
    assert.ok(foundation.tokenCache);
    assert.equal(foundation.runtimeAdapterRegistry.has("MTN_MOMO"), true);
    assert.equal(foundation.runtimeAdapterRegistry.has("PAYPACK"), true);
    assert.equal(foundation.runtimeFeatureFlags.isEnabled("runtimeSandboxEnabled"), false);
    assert.equal(Object.isFrozen(foundation), true);
  });

  it("composes resolver when provider foundation is supplied", () => {
    const foundation = createCombinedFoundation();

    assert.ok(foundation.runtimeAdapterResolver);
    const decision = foundation.runtimeAdapterResolver.resolve({ providerCode: "MTN_MOMO" });
    assert.equal(decision.executionMode, "MOCK");
    assert.equal(decision.reason, "providerFlagDisabled");
    assert.equal(decision.fallbackAllowed, true);
  });

  it("does not wire PaymentModule or engine dependencies", () => {
    const foundation = createRuntimeFoundation();
    assert.equal("paymentModule" in foundation, false);
    assert.equal("engine" in foundation, false);
    assert.equal("gate" in foundation, false);
  });

  it("allows custom runtime adapter registry injection", () => {
    const customRegistry = createRuntimeFoundation({ registerDefaults: false }).runtimeAdapterRegistry;
    const foundation = createRuntimeFoundation({
      runtimeAdapterRegistry: customRegistry,
      registerDefaults: false,
    });

    assert.equal(foundation.runtimeAdapterRegistry, customRegistry);
    assert.equal(foundation.runtimeAdapterRegistry.has("MTN_MOMO"), false);
  });

  it("exposes execution guard with sandbox defaults", () => {
    const foundation = createRuntimeFoundation();
    assert.doesNotThrow(() => foundation.runtimeExecutionGuard.assertEnvironment("sandbox"));
    assert.throws(
      () => foundation.runtimeExecutionGuard.assertEnvironment("production"),
      /not allowed/
    );
  });
});

describe("RuntimeBootstrap resolver integration", () => {
  it("returns null resolver without provider foundation unless injected", () => {
    const foundation = createRuntimeFoundation();
    assert.equal(foundation.runtimeAdapterResolver, null);
  });

  it("accepts injected resolver", () => {
    const base = createCombinedFoundation();
    const resolver = new RuntimeAdapterResolver({
      runtimeAdapterRegistry: base.runtimeAdapterRegistry,
      runtimeFeatureFlags: base.runtimeFeatureFlags,
      featureFlags: base.featureFlags,
      providerRegistry: base.providerRegistry,
      skeletonAdapterRegistry: base.adapterRegistry,
      environmentResolver: base.runtime.environmentResolver,
    });

    const foundation = createRuntimeFoundation({
      runtimeAdapterResolver: resolver,
      registerDefaults: false,
    });

    assert.equal(foundation.runtimeAdapterResolver, resolver);
  });
});
