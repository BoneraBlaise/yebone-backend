const CredentialProvider = require("./CredentialProvider");
const { NoOpSecretManagerProvider } = require("./SecretManagerProvider");

/**
 * Secret manager credential provider — delegates to SecretManagerProvider contract.
 * No cloud SDK; architecture only.
 */
class SecretManagerCredentialProvider extends CredentialProvider {
  constructor(options = {}) {
    super();
    this.secretManager = options.secretManager || options.secretStore || new NoOpSecretManagerProvider();
  }

  supports() {
    return Boolean(this.secretManager);
  }

  _secretKey(providerCode) {
    return `payments/providers/${String(providerCode || "").trim().toUpperCase()}`;
  }

  async getCredentials(providerCode) {
    const code = String(providerCode || "").trim().toUpperCase();
    const secretKey = this._secretKey(code);
    const exists = await this.secretManager.exists(secretKey);

    if (!exists) {
      return Object.freeze({
        providerCode: code,
        found: false,
        source: "secret_manager",
        credentials: Object.freeze({}),
      });
    }

    const loaded = await this.secretManager.load(secretKey);
    if (!loaded || typeof loaded !== "object") {
      return Object.freeze({
        providerCode: code,
        found: false,
        source: "secret_manager",
        credentials: Object.freeze({}),
      });
    }

    return Object.freeze({
      providerCode: code,
      found: true,
      source: "secret_manager",
      credentials: Object.freeze({ ...loaded }),
    });
  }

  async health() {
    return this.secretManager.health();
  }
}

module.exports = SecretManagerCredentialProvider;
