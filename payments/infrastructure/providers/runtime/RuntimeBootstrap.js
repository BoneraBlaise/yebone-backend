const RuntimeConfig = require("./RuntimeConfig");
const RuntimeFactory = require("./RuntimeFactory");
const ProviderTokenCache = require("./ProviderTokenCache");
const RuntimeFeatureFlagRegistry = require("./RuntimeFeatureFlagRegistry");
const RuntimeAdapterRegistry = require("./RuntimeAdapterRegistry");
const RuntimeExecutionGuard = require("./RuntimeExecutionGuard");
const RuntimeAdapterResolver = require("./RuntimeAdapterResolver");

const DEFAULT_RUNTIME_PROVIDERS = Object.freeze(["MTN_MOMO", "PAYPACK"]);

/**
 * Composition root for Module 10 Phase 2A runtime registration — not wired to PaymentModule.
 */
function createRuntimeFoundation(options = {}) {
  const runtimeFeatureFlags =
    options.runtimeFeatureFlags ||
    new RuntimeFeatureFlagRegistry(options.runtimeFeatureFlagOverrides);

  const tokenCache = options.tokenCache || new ProviderTokenCache();
  const runtimeAdapterRegistry =
    options.runtimeAdapterRegistry || new RuntimeAdapterRegistry();

  const runtime =
    options.runtime ||
    RuntimeFactory.create({
      ...options,
      tokenCache,
    });

  if (options.registerDefaults !== false) {
    registerDefaultRuntimeAdapters(runtimeAdapterRegistry, runtime);
  }

  const environmentResolver = runtime.environmentResolver;

  const runtimeExecutionGuard =
    options.runtimeExecutionGuard ||
    new RuntimeExecutionGuard({
      runtimeFeatureFlags,
      environmentResolver,
      runtimeConfig: RuntimeConfig,
    });

  let runtimeAdapterResolver = options.runtimeAdapterResolver || null;
  if (!runtimeAdapterResolver && options.providerRegistry && options.skeletonAdapterRegistry) {
    runtimeAdapterResolver = new RuntimeAdapterResolver({
      runtimeAdapterRegistry,
      runtimeFeatureFlags,
      featureFlags: options.featureFlags,
      providerRegistry: options.providerRegistry,
      skeletonAdapterRegistry: options.skeletonAdapterRegistry,
      environmentResolver,
    });
  }

  let providerExecutionOrchestrator = options.providerExecutionOrchestrator || null;
  if (
    !providerExecutionOrchestrator &&
    options.providerAdapterResolver &&
    runtimeAdapterResolver &&
    options.providerCapabilityValidator
  ) {
    providerExecutionOrchestrator = RuntimeFactory.createProviderExecutionOrchestrator({
      providerAdapterResolver: options.providerAdapterResolver,
      runtimeAdapterResolver,
      runtimeExecutionGuard,
      providerCapabilityValidator: options.providerCapabilityValidator,
    });
  }

  return Object.freeze({
    version: RuntimeConfig.version,
    runtimeFeatureFlags,
    runtimeAdapterRegistry,
    runtimeExecutionGuard,
    runtimeAdapterResolver,
    providerExecutionOrchestrator,
    runtime,
    tokenCache,
  });
}

function registerDefaultRuntimeAdapters(runtimeAdapterRegistry, runtime) {
  runtimeAdapterRegistry.register("MTN_MOMO", runtime.mtnMoMo, {
    enabled: false,
    name: "MTN MoMo Runtime",
  });
  runtimeAdapterRegistry.register("PAYPACK", runtime.paypack, {
    enabled: false,
    name: "Paypack Runtime",
  });
  return Object.freeze(DEFAULT_RUNTIME_PROVIDERS.slice());
}

function createProviderExecutionOrchestrator(options = {}) {
  return RuntimeFactory.createProviderExecutionOrchestrator(options);
}

module.exports = {
  createRuntimeFoundation,
  registerDefaultRuntimeAdapters,
  createProviderExecutionOrchestrator,
};
