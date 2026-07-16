/**
 * In-memory OAuth token cache for MTN MoMo sandbox.
 */
class MTNMoMoTokenCache {
  constructor() {
    this.cache = new Map();
  }

  _key(providerCode, scope) {
    return `${String(providerCode).toUpperCase()}:${String(scope).toLowerCase()}`;
  }

  get(providerCode, scope) {
    const entry = this.cache.get(this._key(providerCode, scope));
    if (!entry) {
      return null;
    }
    if (Date.now() >= entry.expiresAt) {
      this.cache.delete(this._key(providerCode, scope));
      return null;
    }
    return Object.freeze({ ...entry.token });
  }

  set(providerCode, scope, token, expiresInSeconds = 3600) {
    const ttlMs = Math.max(0, (expiresInSeconds - 60) * 1000);
    this.cache.set(this._key(providerCode, scope), {
      token: Object.freeze({ ...token }),
      expiresAt: Date.now() + ttlMs,
    });
  }

  clear(providerCode, scope) {
    if (scope) {
      this.cache.delete(this._key(providerCode, scope));
      return;
    }
    for (const key of this.cache.keys()) {
      if (key.startsWith(`${String(providerCode).toUpperCase()}:`)) {
        this.cache.delete(key);
      }
    }
  }
}

module.exports = MTNMoMoTokenCache;
