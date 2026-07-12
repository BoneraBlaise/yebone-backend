/**
 * Secret access facade over SecretProvider interface.
 */
class SecretManager {
  constructor({ provider }) {
    this.provider = provider;
  }

  getSecret(name) {
    return this.provider.get(name);
  }

  setSecret(name, value) {
    return this.provider.set(name, value);
  }

  hasSecret(name) {
    return this.provider.has(name);
  }

  removeSecret(name) {
    return this.provider.delete(name);
  }
}

module.exports = SecretManager;
