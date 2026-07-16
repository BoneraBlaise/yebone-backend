const DEFAULT_RUNTIME_FLAGS = Object.freeze({
  runtimeSandboxEnabled: false,
  mtnRuntimeEnabled: false,
  paypackRuntimeEnabled: false,
});

const PROVIDER_RUNTIME_FLAG_MAP = Object.freeze({
  MTN_MOMO: "mtnRuntimeEnabled",
  PAYPACK: "paypackRuntimeEnabled",
});

/**
 * Runtime-only feature flags — additive, default OFF.
 * Does not modify Module 4 FeatureFlagRegistry.
 */
class RuntimeFeatureFlagRegistry {
  constructor(initial = {}) {
    this.flags = { ...DEFAULT_RUNTIME_FLAGS, ...initial };
  }

  isEnabled(flagName) {
    return Boolean(this.flags[flagName]);
  }

  enable(flagName) {
    if (!(flagName in DEFAULT_RUNTIME_FLAGS)) {
      throw new Error(`Unknown runtime feature flag: ${flagName}`);
    }
    this.flags[flagName] = true;
  }

  disable(flagName) {
    if (!(flagName in DEFAULT_RUNTIME_FLAGS)) {
      throw new Error(`Unknown runtime feature flag: ${flagName}`);
    }
    this.flags[flagName] = false;
  }

  list() {
    return Object.freeze({ ...this.flags });
  }

  isProviderRuntimeEnabled(providerCode) {
    const flag = RuntimeFeatureFlagRegistry.getProviderRuntimeFlagName(providerCode);
    if (!flag) {
      return false;
    }
    return this.isEnabled("runtimeSandboxEnabled") && this.isEnabled(flag);
  }

  static getProviderRuntimeFlagName(providerCode) {
    return PROVIDER_RUNTIME_FLAG_MAP[providerCode] || null;
  }
}

module.exports = RuntimeFeatureFlagRegistry;
