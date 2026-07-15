const ProviderRegistry = require("../engine/ProviderRegistry");
const ProviderResolver = require("../engine/ProviderResolver");
const FeatureFlagRegistry = require("../engine/FeatureFlagRegistry");
const ProviderAdapterConfig = require("./ProviderAdapterConfig");
const ProviderAdapterRegistry = require("./ProviderAdapterRegistry");
const ProviderAdapterResolver = require("./ProviderAdapterResolver");
const ProviderCapabilityValidator = require("./ProviderCapabilityValidator");
const ProviderAdapterFeatureGate = require("./ProviderAdapterFeatureGate");

function createProviderFoundation(options = {}) {
  const featureFlags = options.featureFlags || new FeatureFlagRegistry(options.featureFlagOverrides);
  const providerRegistry = options.providerRegistry || new ProviderRegistry();
  const capabilityValidator =
    options.capabilityValidator || new ProviderCapabilityValidator();
  const featureGate =
    options.featureGate ||
    new ProviderAdapterFeatureGate({ registry: providerRegistry, featureFlags });

  const adapterRegistry =
    options.adapterRegistry ||
    new ProviderAdapterRegistry({
      registry: providerRegistry,
      featureGate,
      capabilityValidator,
      featureFlags,
    });

  if (options.registerDefaults !== false) {
    adapterRegistry.registerDefaultAdapters();
  }

  const providerResolver =
    options.providerResolver ||
    new ProviderResolver({ registry: providerRegistry, featureFlags });

  const adapterResolver =
    options.adapterResolver ||
    new ProviderAdapterResolver({
      providerResolver,
      registry: providerRegistry,
      featureFlags,
    });

  return Object.freeze({
    config: ProviderAdapterConfig,
    featureFlags,
    providerRegistry,
    adapterRegistry,
    providerResolver,
    adapterResolver,
    capabilityValidator,
    featureGate,
  });
}

module.exports = createProviderFoundation;
