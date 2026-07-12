const CacheProvider = require("./CacheProvider");

/**
 * In-memory cache with TTL support.
 */
class MemoryCacheProvider extends CacheProvider {
  constructor() {
    super();
    this.entries = new Map();
  }

  get(key) {
    const entry = this.entries.get(key);
    if (!entry) return null;
    if (entry.expiresAt && Date.now() > entry.expiresAt) {
      this.entries.delete(key);
      return null;
    }
    return entry.value;
  }

  set(key, value, ttlMs = null) {
    const expiresAt = ttlMs ? Date.now() + ttlMs : null;
    this.entries.set(key, { value, expiresAt, setAt: Date.now() });
    return true;
  }

  delete(key) {
    return this.entries.delete(key);
  }

  clear() {
    this.entries.clear();
    return true;
  }

  ttl(key) {
    const entry = this.entries.get(key);
    if (!entry || !entry.expiresAt) return -1;
    return Math.max(0, entry.expiresAt - Date.now());
  }
}

module.exports = MemoryCacheProvider;
