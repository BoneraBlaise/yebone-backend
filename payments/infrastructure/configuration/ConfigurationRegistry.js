/**
 * Registry for configuration namespaces.
 */
class ConfigurationRegistry {
  constructor() {
    this.namespaces = new Map();
  }

  register(namespace, config) {
    this.namespaces.set(namespace, config);
    return this;
  }

  get(namespace) {
    return this.namespaces.get(namespace) || null;
  }

  all() {
    return Object.fromEntries(this.namespaces.entries());
  }
}

module.exports = ConfigurationRegistry;
