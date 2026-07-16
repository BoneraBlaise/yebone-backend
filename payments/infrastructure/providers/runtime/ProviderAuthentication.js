const ProviderAuthError = require("./errors/ProviderAuthError");

/**
 * Base provider authentication orchestration.
 */
class ProviderAuthentication {
  constructor({ credentialStore, tokenCache }) {
    if (!credentialStore) {
      throw new Error("ProviderAuthentication requires credentialStore");
    }
    this.credentialStore = credentialStore;
    this.tokenCache = tokenCache || null;
  }

  async getCachedToken(providerCode, scope) {
    if (!this.tokenCache) {
      return null;
    }
    return this.tokenCache.get(providerCode, scope);
  }

  async setCachedToken(providerCode, scope, token, expiresInSeconds) {
    if (!this.tokenCache) {
      return;
    }
    this.tokenCache.set(providerCode, scope, token, expiresInSeconds);
  }

  assertCredentials(credentialResult, providerCode) {
    if (!credentialResult?.found) {
      throw new ProviderAuthError(`Missing credentials for ${providerCode}`, { providerCode });
    }
  }
}

module.exports = ProviderAuthentication;
