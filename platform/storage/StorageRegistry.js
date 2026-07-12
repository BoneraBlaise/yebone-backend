class StorageRegistry {
  constructor() {
    this._providers = new Map();
  }

  register(name, provider, metadata = {}) {
    this._providers.set(name, { provider, metadata, registeredAt: Date.now() });
    return this;
  }

  get(name) {
    return this._providers.get(name)?.provider || null;
  }

  getMetadata(name) {
    return this._providers.get(name)?.metadata || null;
  }

  has(name) {
    return this._providers.has(name);
  }

  list() {
    return [...this._providers.keys()];
  }
}

module.exports = StorageRegistry;
