const CredentialProvider = require("./CredentialProvider");

/**
 * Future vault integration stub — no external calls at Phase 1.
 */
class VaultCredentialProvider extends CredentialProvider {
  constructor(options = {}) {
    super();
    this.vaultClient = options.vaultClient || null;
  }

  supports() {
    return Boolean(this.vaultClient);
  }

  async getCredentials(providerCode) {
    const code = String(providerCode || "").trim().toUpperCase();
    return Object.freeze({
      providerCode: code,
      found: false,
      source: "vault",
      credentials: Object.freeze({}),
      message: "Vault integration deferred — inject vaultClient in Module 10+",
    });
  }
}

module.exports = VaultCredentialProvider;
