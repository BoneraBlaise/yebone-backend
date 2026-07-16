const RuntimeFeatureFlagRegistry = require("../providers/runtime/RuntimeFeatureFlagRegistry");

/**
 * Explicit rollout support — applies env overrides only when invoked.
 * Defaults remain OFF; no automatic env loading at bootstrap.
 */
class FeatureFlagRolloutSupport {
  static ENGINE_ENV_MAP = Object.freeze({
    PAYMENT_ENGINE_ENABLED: "paymentEngineEnabled",
    PAYMENT_MTN_ENABLED: "mtnEnabled",
    PAYMENT_AIRTEL_ENABLED: "airtelEnabled",
    PAYMENT_FLUTTERWAVE_ENABLED: "flutterwaveEnabled",
    PAYMENT_PAYPACK_ENABLED: "paypackEnabled",
    PAYMENT_STRIPE_ENABLED: "stripeEnabled",
  });

  static RUNTIME_ENV_MAP = Object.freeze({
    PAYMENT_RUNTIME_SANDBOX_ENABLED: "runtimeSandboxEnabled",
    PAYMENT_MTN_RUNTIME_ENABLED: "mtnRuntimeEnabled",
    PAYMENT_PAYPACK_RUNTIME_ENABLED: "paypackRuntimeEnabled",
  });

  static applyEngineEnvOverrides(featureFlags, env = process.env) {
    if (!featureFlags) {
      throw new Error("FeatureFlagRolloutSupport requires featureFlags");
    }
    FeatureFlagRolloutSupport._applyMap(featureFlags, FeatureFlagRolloutSupport.ENGINE_ENV_MAP, env);
    return featureFlags;
  }

  static applyRuntimeEnvOverrides(runtimeFeatureFlags, env = process.env) {
    if (!runtimeFeatureFlags) {
      throw new Error("FeatureFlagRolloutSupport requires runtimeFeatureFlags");
    }
    FeatureFlagRolloutSupport._applyMap(
      runtimeFeatureFlags,
      FeatureFlagRolloutSupport.RUNTIME_ENV_MAP,
      env
    );
    return runtimeFeatureFlags;
  }

  static applyAll({ featureFlags, runtimeFeatureFlags, env = process.env } = {}) {
    if (featureFlags) {
      FeatureFlagRolloutSupport.applyEngineEnvOverrides(featureFlags, env);
    }
    if (runtimeFeatureFlags) {
      FeatureFlagRolloutSupport.applyRuntimeEnvOverrides(runtimeFeatureFlags, env);
    }
    return Object.freeze({
      featureFlags: featureFlags?.list?.() || null,
      runtimeFeatureFlags: runtimeFeatureFlags?.list?.() || null,
    });
  }

  static describeRolloutSupport() {
    return Object.freeze({
      defaults: "OFF",
      engineFlags: Object.values(FeatureFlagRolloutSupport.ENGINE_ENV_MAP),
      runtimeFlags: Object.values(FeatureFlagRolloutSupport.RUNTIME_ENV_MAP),
      envKeys: Object.freeze([
        ...Object.keys(FeatureFlagRolloutSupport.ENGINE_ENV_MAP),
        ...Object.keys(FeatureFlagRolloutSupport.RUNTIME_ENV_MAP),
      ]),
      liveExecution: "blocked — PAYMENT_RUNTIME_LIVE rejected by RuntimeExecutionGuard",
    });
  }

  static _applyMap(registry, envMap, env) {
    for (const [envKey, flagName] of Object.entries(envMap)) {
      const value = env[envKey];
      if (value === undefined || value === null || value === "") {
        continue;
      }
      if (FeatureFlagRolloutSupport._isTruthy(value)) {
        registry.enable(flagName);
      } else {
        registry.disable(flagName);
      }
    }
  }

  static _isTruthy(value) {
    const normalized = String(value).trim().toLowerCase();
    return normalized === "1" || normalized === "true" || normalized === "yes" || normalized === "on";
  }
}

module.exports = FeatureFlagRolloutSupport;
