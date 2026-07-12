class ConfigurationRegistry {
  constructor() {
    this._configs = new Map();
  }
  register(name, config) {
    this._configs.set(name, config);
    return this;
  }
  get(name) { return this._configs.get(name) || null; }
  has(name) { return this._configs.has(name); }
  list() { return [...this._configs.keys()]; }
  snapshot() {
    return Object.fromEntries(this.list().map((n) => [n, this.get(n)?.constructor?.name || "unknown"]));
  }
}
module.exports = ConfigurationRegistry;
