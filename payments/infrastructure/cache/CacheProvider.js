/**
 * Cache provider contract.
 */
class CacheProvider {
  get(_key) {
    throw new Error("CacheProvider.get must be implemented");
  }

  set(_key, _value, _ttlMs = null) {
    throw new Error("CacheProvider.set must be implemented");
  }

  delete(_key) {
    throw new Error("CacheProvider.delete must be implemented");
  }

  clear() {
    throw new Error("CacheProvider.clear must be implemented");
  }

  ttl(_key) {
    throw new Error("CacheProvider.ttl must be implemented");
  }
}

module.exports = CacheProvider;
