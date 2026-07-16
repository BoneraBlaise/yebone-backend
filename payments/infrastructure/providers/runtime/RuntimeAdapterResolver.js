const { createExecutionDecision } = require("./ExecutionDecision");
const RuntimeFeatureFlagRegistry = require("./RuntimeFeatureFlagRegistry");

/**
 * Single authority for runtime execution mode selection — decision only, no execution.
 */
class RuntimeAdapterResolver {
  constructor({
    runtimeAdapterRegistry,
    runtimeFeatureFlags,
    featureFlags,
    providerRegistry,
    skeletonAdapterRegistry,
    environmentResolver,
  }) {
    if (!runtimeAdapterRegistry) {
      throw new Error("RuntimeAdapterResolver requires runtimeAdapterRegistry");
    }
    if (!providerRegistry) {
      throw new Error("RuntimeAdapterResolver requires providerRegistry");
    }
    if (!skeletonAdapterRegistry) {
      throw new Error("RuntimeAdapterResolver requires skeletonAdapterRegistry");
    }

    this.runtimeAdapterRegistry = runtimeAdapterRegistry;
    this.runtimeFeatureFlags =
      runtimeFeatureFlags || new RuntimeFeatureFlagRegistry();
    this.featureFlags = featureFlags || null;
    this.providerRegistry = providerRegistry;
    this.skeletonAdapterRegistry = skeletonAdapterRegistry;
    this.environmentResolver = environmentResolver || null;
  }

  resolve({ providerCode, environment = "sandbox" } = {}) {
    const code = this._normalizeCode(providerCode);
    if (!code) {
      return createExecutionDecision({
        executionMode: "MOCK",
        providerCode: "UNKNOWN",
        adapter: null,
        descriptor: { code: "UNKNOWN" },
        reason: "fallbackDefault",
        fallbackAllowed: true,
      });
    }

    let descriptor;
    try {
      descriptor = this.providerRegistry.resolve(code);
    } catch {
      return this._mockDecision(code, null, { code }, "fallbackDefault");
    }

    const skeletonAdapter = this.skeletonAdapterRegistry.getAdapter(code);

    if (this.featureFlags && !this.featureFlags.isProviderEnabled(code)) {
      return this._mockDecision(code, skeletonAdapter, descriptor, "providerFlagDisabled");
    }

    if (!descriptor.enabled) {
      return this._mockDecision(code, skeletonAdapter, descriptor, "registryDisabled");
    }

    if (!this.runtimeFeatureFlags.isEnabled("runtimeSandboxEnabled")) {
      return this._mockDecision(code, skeletonAdapter, descriptor, "runtimeSandboxDisabled");
    }

    const providerRuntimeFlag = RuntimeFeatureFlagRegistry.getProviderRuntimeFlagName(code);
    if (!providerRuntimeFlag || !this.runtimeFeatureFlags.isEnabled(providerRuntimeFlag)) {
      return this._mockDecision(code, skeletonAdapter, descriptor, "providerRuntimeDisabled");
    }

    if (!this.runtimeAdapterRegistry.has(code)) {
      return this._mockDecision(code, skeletonAdapter, descriptor, "runtimeNotRegistered");
    }

    const env = String(environment || "sandbox").trim().toLowerCase();
    if (env !== "sandbox") {
      return this._mockDecision(code, skeletonAdapter, descriptor, "environmentNotSandbox");
    }

    if (this.environmentResolver) {
      try {
        this.environmentResolver.resolve(code, env);
      } catch {
        return this._mockDecision(code, skeletonAdapter, descriptor, "environmentNotSandbox");
      }
    }

    const runtimeEntry = this.runtimeAdapterRegistry.get(code);
    return createExecutionDecision({
      executionMode: "RUNTIME_SANDBOX",
      providerCode: code,
      adapter: runtimeEntry.adapter,
      descriptor,
      reason: "runtimeEnabled",
      fallbackAllowed: false,
    });
  }

  _mockDecision(providerCode, adapter, descriptor, reason) {
    return createExecutionDecision({
      executionMode: "MOCK",
      providerCode,
      adapter,
      descriptor,
      reason,
      fallbackAllowed: true,
    });
  }

  _normalizeCode(code) {
    return String(code || "").trim().toUpperCase();
  }
}

module.exports = RuntimeAdapterResolver;
