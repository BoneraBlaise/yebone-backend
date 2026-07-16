const CredentialProvider = require("./CredentialProvider");

/**
 * Future secret-manager integration stub — no external calls at Phase 1.
 */
class SecretManagerCredentialProvider extends CredentialProvider {
  constructor(options = {}) {
    super();
    this.secretStore = options.secretStore || null;
  }

  supports() {
    return Boolean(this.secretStore);
  }

  async getCredentials(providerCode) {
    const code = String(providerCode || "").trim().toUpperCase();
    return Object.freeze({
      providerCode: code,
      found: false,
      source: "secret_manager",
      credentials: Object.freeze({}),
      message: "Secret manager integration deferred — inject secretStore in Module 10+",
    });
  }
}

module.exports = SecretManagerCredentialProvider;
