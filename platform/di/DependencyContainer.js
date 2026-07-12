/**
 * Dependency injection container — no singleton globals.
 */
class DependencyContainer {
  constructor() {
    this._services = new Map();
    this._factories = new Map();
  }

  register(name, instance) {
    this._services.set(name, { type: "instance", value: instance });
    return this;
  }

  registerFactory(name, factory) {
    this._factories.set(name, factory);
    return this;
  }

  resolve(name) {
    if (this._services.has(name)) {
      const entry = this._services.get(name);
      return entry.value;
    }
    if (this._factories.has(name)) {
      const instance = this._factories.get(name)(this);
      this._services.set(name, { type: "factory", value: instance });
      return instance;
    }
    return null;
  }

  has(name) {
    return this._services.has(name) || this._factories.has(name);
  }

  list() {
    const names = new Set([...this._services.keys(), ...this._factories.keys()]);
    return [...names];
  }

  snapshot() {
    return Object.fromEntries(
      this.list().map((name) => {
        const value = this.resolve(name);
        return [name, { type: value?.constructor?.name || typeof value }];
      })
    );
  }
}

module.exports = DependencyContainer;
