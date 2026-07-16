const {
  createCredentialRotationMetadata,
} = require("./CredentialRotationMetadata");

/**
 * Credential refresh architecture — clients may request refreshed credentials.
 * No automatic production refresh.
 */
class CredentialRefreshService {
  constructor({ credentialStore, env = process.env, clock = Date } = {}) {
    if (!credentialStore) {
      throw new Error("CredentialRefreshService requires credentialStore");
    }
    this.credentialStore = credentialStore;
    this.env = env;
    this.clock = clock;
  }

  async load(providerCode, options = {}) {
    const result = await this.credentialStore.load(providerCode, options);
    return this._attachRotation(result);
  }

  async refresh(providerCode, options = {}) {
    const result = await this.credentialStore.load(providerCode, {
      ...options,
      required: options.required !== false,
    });

    const previousVersion = result.rotation?.version || this._readVersion(providerCode);
    const rotation = createCredentialRotationMetadata({
      version: previousVersion + 1,
      expiresAt: this._readExpiresAt(providerCode),
      rotatedAt: new Date(this.clock.now()).toISOString(),
    });

    return Object.freeze({
      ...result,
      rotation,
      refreshed: true,
    });
  }

  _attachRotation(result) {
    if (!result?.found) {
      return Object.freeze({ ...result, rotation: null, refreshed: false });
    }

    return Object.freeze({
      ...result,
      rotation: createCredentialRotationMetadata({
        version: this._readVersion(result.providerCode),
        expiresAt: this._readExpiresAt(result.providerCode),
        rotatedAt: this._readRotatedAt(result.providerCode),
      }),
      refreshed: false,
    });
  }

  _readVersion(providerCode) {
    const key = `${String(providerCode || "").trim().toUpperCase()}_CREDENTIAL_VERSION`;
    const value = Number(this.env[key]);
    return Number.isFinite(value) && value > 0 ? value : 1;
  }

  _readExpiresAt(providerCode) {
    const key = `${String(providerCode || "").trim().toUpperCase()}_CREDENTIAL_EXPIRES_AT`;
    return this.env[key] || null;
  }

  _readRotatedAt(providerCode) {
    const key = `${String(providerCode || "").trim().toUpperCase()}_CREDENTIAL_ROTATED_AT`;
    return this.env[key] || null;
  }
}

module.exports = CredentialRefreshService;
