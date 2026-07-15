const createProviderFoundation = require("../ProviderAdapterFactory");
const FeatureFlagRegistry = require("../../engine/FeatureFlagRegistry");

function createEnabledFoundation(providerCode, flagName) {
  const foundation = createProviderFoundation();
  foundation.providerRegistry.enable(providerCode);
  foundation.featureFlags.enable(flagName);
  return foundation;
}

function enableMtn(foundation) {
  foundation.providerRegistry.enable("MTN_MOMO");
  foundation.featureFlags.enable("mtnEnabled");
  return foundation;
}

function enableStripe(foundation) {
  foundation.providerRegistry.enable("STRIPE");
  foundation.featureFlags.enable("stripeEnabled");
  return foundation;
}

module.exports = {
  createProviderFoundation,
  createEnabledFoundation,
  enableMtn,
  enableStripe,
  FeatureFlagRegistry,
};
