const ProviderCredentialError = require("./errors/ProviderCredentialError");

/**
 * Aggregates credential providers — environment first, then future backends.
 */
class ProviderCredentialStore {
  constructor(providers = []) {
    if (!Array.isArray(providers) || providers.length === 0) {
      throw new Error("ProviderCredentialStore requires at least one credential provider");
    }
    this.providers = providers;
  }

  async load(providerCode, { required = false } = {}) {
    for (const provider of this.providers) {
      if (!provider.supports(providerCode)) {
        continue;
      }
      const result = await provider.getCredentials(providerCode);
      if (result.found) {
        return result;
      }
    }

    const empty = Object.freeze({
      providerCode: String(providerCode || "").trim().toUpperCase(),
      found: false,
      source: "none",
      credentials: Object.freeze({}),
    });

    if (required) {
      throw new ProviderCredentialError(
        `Credentials not found for provider ${empty.providerCode}`,
        { providerCode: empty.providerCode }
      );
    }

    return empty;
  }
}

module.exports = ProviderCredentialStore;
