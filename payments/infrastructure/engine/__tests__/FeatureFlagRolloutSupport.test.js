const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const FeatureFlagRolloutSupport = require("../FeatureFlagRolloutSupport");
const FeatureFlagRegistry = require("../FeatureFlagRegistry");
const RuntimeFeatureFlagRegistry = require("../../providers/runtime/RuntimeFeatureFlagRegistry");

describe("FeatureFlagRolloutSupport", () => {
  it("keeps defaults OFF when env is empty", () => {
    const featureFlags = new FeatureFlagRegistry();
    const runtimeFeatureFlags = new RuntimeFeatureFlagRegistry();

    FeatureFlagRolloutSupport.applyAll({ featureFlags, runtimeFeatureFlags, env: {} });

    assert.equal(featureFlags.isEnabled("paymentEngineEnabled"), false);
    assert.equal(runtimeFeatureFlags.isEnabled("runtimeSandboxEnabled"), false);
  });

  it("enables engine and runtime flags from env when explicitly applied", () => {
    const featureFlags = new FeatureFlagRegistry();
    const runtimeFeatureFlags = new RuntimeFeatureFlagRegistry();

    FeatureFlagRolloutSupport.applyAll({
      featureFlags,
      runtimeFeatureFlags,
      env: {
        PAYMENT_ENGINE_ENABLED: "true",
        PAYMENT_PAYPACK_ENABLED: "yes",
        PAYMENT_RUNTIME_SANDBOX_ENABLED: "on",
        PAYMENT_PAYPACK_RUNTIME_ENABLED: "1",
      },
    });

    assert.equal(featureFlags.isEnabled("paymentEngineEnabled"), true);
    assert.equal(featureFlags.isEnabled("paypackEnabled"), true);
    assert.equal(runtimeFeatureFlags.isEnabled("runtimeSandboxEnabled"), true);
    assert.equal(runtimeFeatureFlags.isEnabled("paypackRuntimeEnabled"), true);
  });

  it("disables flags when env is explicitly false", () => {
    const featureFlags = new FeatureFlagRegistry({ paymentEngineEnabled: true });
    FeatureFlagRolloutSupport.applyEngineEnvOverrides(featureFlags, {
      PAYMENT_ENGINE_ENABLED: "false",
    });
    assert.equal(featureFlags.isEnabled("paymentEngineEnabled"), false);
  });
});
