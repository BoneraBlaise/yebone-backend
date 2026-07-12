const EnvironmentProvider = require("./EnvironmentProvider");

/**
 * In-memory environment abstraction.
 */
class MemoryEnvironmentProvider extends EnvironmentProvider {
  constructor(initial = {}) {
    super();
    this.values = new Map(Object.entries(initial));
  }

  get(key, defaultValue = null) {
    return this.values.has(key) ? this.values.get(key) : defaultValue;
  }

  set(key, value) {
    this.values.set(key, value);
    return this;
  }

  has(key) {
    return this.values.has(key);
  }

  all() {
    return Object.fromEntries(this.values.entries());
  }
}

module.exports = MemoryEnvironmentProvider;
