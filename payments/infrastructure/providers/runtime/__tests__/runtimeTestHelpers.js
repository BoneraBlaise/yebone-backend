const createProviderFoundation = require("../../ProviderAdapterFactory");
const { createRuntimeFoundation } = require("../RuntimeBootstrap");
const RuntimeFeatureFlagRegistry = require("../RuntimeFeatureFlagRegistry");

function createMockRuntimeAdapter(providerCode) {
  return Object.freeze({
    providerCode,
    kind: "mock-runtime",
    health() {
      return Object.freeze({ ready: true, providerCode });
    },
  });
}

function createCombinedFoundation(options = {}) {
  const providerFoundation = createProviderFoundation(options.providerOptions);
  const runtimeFoundation = createRuntimeFoundation({
    ...options.runtimeOptions,
    providerRegistry: providerFoundation.providerRegistry,
    skeletonAdapterRegistry: providerFoundation.adapterRegistry,
    featureFlags: providerFoundation.featureFlags,
    providerAdapterResolver: providerFoundation.adapterResolver,
    providerCapabilityValidator: providerFoundation.capabilityValidator,
  });

  return Object.freeze({
    ...providerFoundation,
    ...runtimeFoundation,
  });
}

function enableMtnRuntime(foundation) {
  foundation.providerRegistry.enable("MTN_MOMO");
  foundation.featureFlags.enable("mtnEnabled");
  foundation.runtimeFeatureFlags.enable("runtimeSandboxEnabled");
  foundation.runtimeFeatureFlags.enable("mtnRuntimeEnabled");
  return foundation;
}

module.exports = {
  createMockRuntimeAdapter,
  createCombinedFoundation,
  enableMtnRuntime,
  RuntimeFeatureFlagRegistry,
};
