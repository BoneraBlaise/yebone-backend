/**
 * Service registry for infrastructure abstractions.
 */
class InfrastructureRegistry {
  constructor() {
    this.services = new Map();
  }

  register(name, service) {
    this.services.set(name, service);
    return this;
  }

  get(name) {
    return this.services.get(name) || null;
  }

  has(name) {
    return this.services.has(name);
  }

  list() {
    return [...this.services.keys()];
  }

  snapshot() {
    return Object.fromEntries(
      [...this.services.entries()].map(([name, service]) => [
        name,
        { type: service?.constructor?.name || typeof service },
      ])
    );
  }
}

module.exports = InfrastructureRegistry;
