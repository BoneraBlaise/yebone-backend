const CredentialProvider = require("./CredentialProvider");

const ENV_PREFIX_MAP = Object.freeze({
  MTN_MOMO: "MTN_MOMO",
  PAYPACK: "PAYPACK",
});

/**
 * Loads credentials from environment variables only.
 * Expected vars (examples, not committed):
 *   MTN_MOMO_SUBSCRIPTION_KEY, MTN_MOMO_API_USER, MTN_MOMO_API_KEY
 *   PAYPACK_CLIENT_ID, PAYPACK_CLIENT_SECRET
 */
class EnvironmentCredentialProvider extends CredentialProvider {
  constructor(options = {}) {
    super();
    this.env = options.env || process.env;
  }

  supports(providerCode) {
    return Boolean(ENV_PREFIX_MAP[String(providerCode || "").trim().toUpperCase()]);
  }

  _loadForPrefix(prefix) {
    if (prefix === "MTN_MOMO") {
      const credentials = {
        subscriptionKey: this.env.MTN_MOMO_SUBSCRIPTION_KEY || null,
        apiUser: this.env.MTN_MOMO_API_USER || null,
        apiKey: this.env.MTN_MOMO_API_KEY || null,
        targetEnvironment: this.env.MTN_MOMO_TARGET_ENV || "sandbox",
      };
      return credentials;
    }

    if (prefix === "PAYPACK") {
      return {
        clientId: this.env.PAYPACK_CLIENT_ID || null,
        clientSecret: this.env.PAYPACK_CLIENT_SECRET || null,
        webhookSecret: this.env.PAYPACK_WEBHOOK_SECRET || null,
      };
    }

    return {};
  }

  _hasRequiredCredentials(prefix, credentials) {
    if (prefix === "MTN_MOMO") {
      return Boolean(credentials.subscriptionKey && credentials.apiUser && credentials.apiKey);
    }
    if (prefix === "PAYPACK") {
      return Boolean(credentials.clientId && credentials.clientSecret);
    }
    return Object.values(credentials).some(Boolean);
  }

  async getCredentials(providerCode) {
    const code = String(providerCode || "").trim().toUpperCase();
    const prefix = ENV_PREFIX_MAP[code];
    if (!prefix) {
      return Object.freeze({ providerCode: code, found: false, credentials: {} });
    }

    const credentials = this._loadForPrefix(prefix);
    return Object.freeze({
      providerCode: code,
      found: this._hasRequiredCredentials(prefix, credentials),
      source: "environment",
      credentials: Object.freeze(credentials),
    });
  }
}

module.exports = EnvironmentCredentialProvider;
