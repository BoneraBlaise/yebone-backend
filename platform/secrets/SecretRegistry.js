class SecretRegistry {
  constructor() {
    this._secrets = new Map();
  }

  register(name, metadata = {}) {
    this._secrets.set(name, { name, ...metadata, registeredAt: Date.now() });
    return this;
  }

  get(name) {
    return this._secrets.get(name) || null;
  }

  list() {
    return [...this._secrets.keys()];
  }
}

module.exports = SecretRegistry;
