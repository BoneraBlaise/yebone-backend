const SecretProvider = require("./SecretProvider");

/**
 * In-memory secret provider — no persistent storage.
 */
class MemorySecretProvider extends SecretProvider {
  constructor() {
    super();
    this.secrets = new Map();
  }

  get(key) {
    return this.secrets.get(key) || null;
  }

  set(key, value) {
    this.secrets.set(key, value);
    return this;
  }

  has(key) {
    return this.secrets.has(key);
  }

  delete(key) {
    return this.secrets.delete(key);
  }
}

module.exports = MemorySecretProvider;
