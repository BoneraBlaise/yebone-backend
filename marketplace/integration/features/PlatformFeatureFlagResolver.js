/**
 * Resolves runtime feature flags from PlatformFeatureFlagService.
 */
function getPlatformFeatureFlags() {
  try {
    const { getPlatformIntegration } = require("../PlatformIntegration");
    return getPlatformIntegration().featureFlags;
  } catch (_error) {
    return null;
  }
}

function isPlatformFeatureEnabled(domain, featureKey = "enabled") {
  const flags = getPlatformFeatureFlags();
  if (!flags) return true;
  return flags.isEnabledSync(domain, featureKey);
}

module.exports = { getPlatformFeatureFlags, isPlatformFeatureEnabled };
