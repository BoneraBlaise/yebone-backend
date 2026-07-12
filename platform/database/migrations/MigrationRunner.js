class MigrationRunner {
  constructor({ registry, tracker, connection }) {
    this.registry = registry;
    this.tracker = tracker;
    this.connection = connection;
  }

  async runPending() {
    const applied = [];
    for (const migration of this.registry.all()) {
      if (this.tracker.isApplied(migration.version)) continue;
      if (typeof migration.up === "function") {
        await migration.up(this.connection);
      }
      this.tracker.markApplied(migration);
      applied.push({ version: migration.version, name: migration.name });
    }
    return {
      applied,
      currentVersion: this.tracker.currentVersion(),
      mode: "placeholder",
    };
  }

  status() {
    return {
      currentVersion: this.tracker.currentVersion(),
      pending: this.registry
        .all()
        .filter((m) => !this.tracker.isApplied(m.version))
        .map((m) => ({ version: m.version, name: m.name })),
      history: this.tracker.history(),
    };
  }
}

module.exports = MigrationRunner;
