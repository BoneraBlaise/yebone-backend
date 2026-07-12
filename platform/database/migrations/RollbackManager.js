class RollbackManager {
  constructor({ registry, tracker, connection }) {
    this.registry = registry;
    this.tracker = tracker;
    this.connection = connection;
  }

  async rollbackTo(version) {
    const migrations = this.registry
      .all()
      .filter((m) => m.version > version && this.tracker.isApplied(m.version))
      .sort((a, b) => b.version - a.version);

    const rolledBack = [];
    for (const migration of migrations) {
      if (typeof migration.down === "function") {
        await migration.down(this.connection);
      }
      this.tracker.markRolledBack(migration);
      rolledBack.push(migration.version);
    }
    return { rolledBack, targetVersion: version };
  }
}

module.exports = RollbackManager;
