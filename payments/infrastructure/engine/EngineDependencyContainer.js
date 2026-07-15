/**
 * Lightweight dependency injection container for Payment Engine bootstrap.
 * No global singleton state.
 */
class EngineDependencyContainer {
  constructor(services = {}) {
    this.services = new Map(Object.entries(services));
  }

  register(name, service) {
    if (!name) {
      throw new Error("Service name is required");
    }
    this.services.set(name, service);
    return this;
  }

  get(name) {
    if (!this.services.has(name)) {
      throw new Error(`Service not registered: ${name}`);
    }
    return this.services.get(name);
  }

  has(name) {
    return this.services.has(name);
  }

  list() {
    return Array.from(this.services.keys());
  }

  snapshot() {
    return Object.fromEntries(this.services.entries());
  }
}

module.exports = EngineDependencyContainer;
