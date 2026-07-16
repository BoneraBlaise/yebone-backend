const CredentialProvider = require("./CredentialProvider");
const { NoOpVaultProvider } = require("./VaultProvider");

/**
 * Vault credential provider — delegates to VaultProvider contract.
 * No vault integration; architecture only.
 */
class VaultCredentialProvider extends CredentialProvider {
  constructor(options = {}) {
    super();
    this.vault = options.vault || options.vaultClient || new NoOpVaultProvider();
  }

  supports() {
    return Boolean(this.vault);
  }

  _secretPath(providerCode) {
    return `payments/providers/${String(providerCode || "").trim().toUpperCase()}`;
  }

  async getCredentials(providerCode) {
    const code = String(providerCode || "").trim().toUpperCase();
    const secretPath = this._secretPath(code);
    const exists = await this.vault.exists(secretPath);

    if (!exists) {
      return Object.freeze({
        providerCode: code,
        found: false,
        source: "vault",
        credentials: Object.freeze({}),
      });
    }

    const loaded = await this.vault.load(secretPath);
    if (!loaded || typeof loaded !== "object") {
      return Object.freeze({
        providerCode: code,
        found: false,
        source: "vault",
        credentials: Object.freeze({}),
      });
    }

    return Object.freeze({
      providerCode: code,
      found: true,
      source: "vault",
      credentials: Object.freeze({ ...loaded }),
    });
  }

  async health() {
    return this.vault.health();
  }
}

module.exports = VaultCredentialProvider;
