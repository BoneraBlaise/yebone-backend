const CredentialProvider = require("./CredentialProvider");

const ENV_PREFIX_MAP = Object.freeze({
  MTN_MOMO: "MTN_MOMO",
  PAYPACK: "PAYPACK",
});

function readEnv(env, ...keys) {
  for (const key of keys) {
    if (env[key] !== undefined && env[key] !== null && String(env[key]).length > 0) {
      return env[key];
    }
  }
  return null;
}

function readEnvOrDefault(env, keys, fallback) {
  return readEnv(env, ...keys) ?? fallback;
}

/**
 * Loads credentials from environment variables only.
 * Supports provider/product separation:
 *   MTN_MOMO_COLLECTION_*, MTN_MOMO_DISBURSEMENT_*
 *   PAYPACK_DEFAULT_*, PAYPACK_CHECKOUT_*
 */
class EnvironmentCredentialProvider extends CredentialProvider {
  constructor(options = {}) {
    super();
    this.env = options.env || process.env;
  }

  supports(providerCode) {
    return Boolean(ENV_PREFIX_MAP[String(providerCode || "").trim().toUpperCase()]);
  }

  _loadMtnCredentials() {
    const collection = Object.freeze({
      subscriptionKey: readEnv(
        this.env,
        "MTN_MOMO_COLLECTION_SUBSCRIPTION_KEY",
        "MTN_MOMO_SUBSCRIPTION_KEY"
      ),
      apiUser: readEnv(this.env, "MTN_MOMO_COLLECTION_API_USER", "MTN_MOMO_API_USER"),
      apiKey: readEnv(this.env, "MTN_MOMO_COLLECTION_API_KEY", "MTN_MOMO_API_KEY"),
      targetEnvironment:
        readEnv(this.env, "MTN_MOMO_COLLECTION_TARGET_ENV", "MTN_MOMO_TARGET_ENV") || "sandbox",
    });

    const disbursement = Object.freeze({
      subscriptionKey: readEnvOrDefault(
        this.env,
        ["MTN_MOMO_DISBURSEMENT_SUBSCRIPTION_KEY"],
        collection.subscriptionKey
      ),
      apiUser: readEnvOrDefault(this.env, ["MTN_MOMO_DISBURSEMENT_API_USER"], collection.apiUser),
      apiKey: readEnvOrDefault(this.env, ["MTN_MOMO_DISBURSEMENT_API_KEY"], collection.apiKey),
      targetEnvironment: collection.targetEnvironment,
    });

    return Object.freeze({
      subscriptionKey: collection.subscriptionKey,
      apiUser: collection.apiUser,
      apiKey: collection.apiKey,
      targetEnvironment: collection.targetEnvironment,
      collection,
      disbursement,
    });
  }

  _loadPaypackCredentials() {
    const defaultProduct = Object.freeze({
      clientId: readEnv(this.env, "PAYPACK_DEFAULT_CLIENT_ID", "PAYPACK_CLIENT_ID"),
      clientSecret: readEnv(this.env, "PAYPACK_DEFAULT_CLIENT_SECRET", "PAYPACK_CLIENT_SECRET"),
      username: readEnv(this.env, "PAYPACK_DEFAULT_USERNAME", "PAYPACK_USERNAME"),
      password: readEnv(this.env, "PAYPACK_DEFAULT_PASSWORD", "PAYPACK_PASSWORD"),
      webhookSecret: readEnv(this.env, "PAYPACK_DEFAULT_WEBHOOK_SECRET", "PAYPACK_WEBHOOK_SECRET"),
      appId: readEnv(this.env, "PAYPACK_DEFAULT_APP_ID", "PAYPACK_APP_ID", "PAYPACK_APPLICATION_ID"),
    });

    const checkout = Object.freeze({
      clientId: readEnvOrDefault(this.env, ["PAYPACK_CHECKOUT_CLIENT_ID"], defaultProduct.clientId),
      clientSecret: readEnvOrDefault(
        this.env,
        ["PAYPACK_CHECKOUT_CLIENT_SECRET"],
        defaultProduct.clientSecret
      ),
      username: readEnvOrDefault(this.env, ["PAYPACK_CHECKOUT_USERNAME"], defaultProduct.username),
      password: readEnvOrDefault(this.env, ["PAYPACK_CHECKOUT_PASSWORD"], defaultProduct.password),
      webhookSecret: readEnvOrDefault(
        this.env,
        ["PAYPACK_CHECKOUT_WEBHOOK_SECRET"],
        defaultProduct.webhookSecret
      ),
      appId:
        readEnv(this.env, "PAYPACK_CHECKOUT_APP_ID") ||
        defaultProduct.appId ||
        readEnv(this.env, "PAYPACK_APP_ID", "PAYPACK_APPLICATION_ID"),
    });

    return Object.freeze({
      clientId: defaultProduct.clientId,
      clientSecret: defaultProduct.clientSecret,
      username: defaultProduct.username,
      password: defaultProduct.password,
      webhookSecret: defaultProduct.webhookSecret,
      appId: defaultProduct.appId,
      applicationId: defaultProduct.appId,
      default: defaultProduct,
      checkout,
    });
  }

  _loadForPrefix(prefix) {
    if (prefix === "MTN_MOMO") {
      return this._loadMtnCredentials();
    }
    if (prefix === "PAYPACK") {
      return this._loadPaypackCredentials();
    }
    return {};
  }

  _hasRequiredCredentials(prefix, credentials) {
    if (prefix === "MTN_MOMO") {
      return Boolean(credentials.subscriptionKey && credentials.apiUser && credentials.apiKey);
    }
    if (prefix === "PAYPACK") {
      return Boolean(
        (credentials.clientId && credentials.clientSecret) ||
          (credentials.username && credentials.password)
      );
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
