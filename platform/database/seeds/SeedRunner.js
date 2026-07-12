class SeedRunner {
  constructor({ registry, connection }) {
    this.registry = registry;
    this.connection = connection;
    this._ran = [];
  }

  async runAll() {
    const results = [];
    for (const seed of this.registry.all()) {
      if (typeof seed.run === "function") {
        const result = await seed.run(this.connection);
        results.push({ name: seed.name, result });
        this._ran.push(seed.name);
      }
    }
    return { seeds: results, mode: "placeholder" };
  }

  history() {
    return [...this._ran];
  }
}

module.exports = SeedRunner;
