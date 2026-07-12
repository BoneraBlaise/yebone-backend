const EnvironmentProvider = require("./EnvironmentProvider");

/**
 * Reads environment from injected loader — no direct global access in consumers.
 */
class ProcessEnvironmentProvider extends EnvironmentProvider {
  constructor({ loader, profile = "development" } = {}) {
    super();
    this.loader = loader;
    this.profile = profile;
  }

  get(key, defaultValue) {
    return this.loader.get(key, defaultValue);
  }

  getAll() {
    return this.loader.load();
  }

  getProfile() {
    return this.profile;
  }
}

module.exports = ProcessEnvironmentProvider;
