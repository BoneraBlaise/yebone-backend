const ProviderHealthStatus = Object.freeze({
  READY: "READY",
  DISABLED: "DISABLED",
  UNREGISTERED: "UNREGISTERED",
});

/**
 * Internal provider health contract — no external API calls.
 */
class ProviderAdapterHealthContract {
  static build({ registry, featureFlags, providerCode }) {
    const code = String(providerCode || "").trim().toUpperCase();

    if (!registry?.has?.(code)) {
      return Object.freeze({
        providerCode: code,
        status: ProviderHealthStatus.UNREGISTERED,
        executable: false,
        adapterRegistered: false,
        registryEnabled: false,
        featureFlagEnabled: false,
      });
    }

    const entry = registry.resolve(code);
    const featureFlagEnabled = Boolean(featureFlags?.isProviderEnabled?.(code));
    const adapterRegistered = Boolean(entry.adapter);
    const registryEnabled = Boolean(entry.enabled);
    const executable =
      adapterRegistered && registryEnabled && featureFlagEnabled;

    const status = executable
      ? ProviderHealthStatus.READY
      : ProviderHealthStatus.DISABLED;

    return Object.freeze({
      providerCode: code,
      status,
      executable,
      adapterRegistered,
      registryEnabled,
      featureFlagEnabled,
      capabilities: [...(entry.capabilities || [])],
      supportedCountries: [...(entry.supportedCountries || [])],
      supportedCurrencies: [...(entry.supportedCurrencies || [])],
      supportedMethods: [...(entry.supportedMethods || [])],
    });
  }

  static buildAll({ registry, featureFlags }) {
    const codes = registry.list().map((entry) => entry.code);
    return Object.freeze(
      codes.map((code) =>
        ProviderAdapterHealthContract.build({ registry, featureFlags, providerCode: code })
      )
    );
  }
}

module.exports = {
  ProviderAdapterHealthContract,
  ProviderHealthStatus,
};
