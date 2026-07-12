class SeedRegistry {
  constructor() {
    this._seeds = [];
  }

  register(seed) {
    this._seeds.push(seed);
    return this;
  }

  all() {
    return [...this._seeds];
  }
}

module.exports = SeedRegistry;
