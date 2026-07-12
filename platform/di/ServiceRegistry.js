/**
 * Named service registry for platform modules.
 */
class ServiceRegistry {
  constructor() {
    this._entries = new Map();
  }

  register(name, service, metadata = {}) {
    this._entries.set(name, { service, metadata, registeredAt: Date.now() });
    return this;
  }

  get(name) {
    return this._entries.get(name)?.service || null;
  }

  getMetadata(name) {
    return this._entries.get(name)?.metadata || null;
  }

  has(name) {
    return this._entries.has(name);
  }

  list() {
    return [...this._entries.keys()];
  }
}

module.exports = ServiceRegistry;
