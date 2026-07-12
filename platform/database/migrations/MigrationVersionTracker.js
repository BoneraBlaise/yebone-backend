class MigrationVersionTracker {
  constructor() {
    this._applied = new Set();
    this._history = [];
  }

  isApplied(version) {
    return this._applied.has(version);
  }

  markApplied(migration) {
    this._applied.add(migration.version);
    this._history.push({
      version: migration.version,
      name: migration.name,
      appliedAt: Date.now(),
    });
  }

  markRolledBack(migration) {
    this._applied.delete(migration.version);
    this._history.push({
      version: migration.version,
      name: migration.name,
      rolledBackAt: Date.now(),
    });
  }

  history() {
    return [...this._history];
  }

  currentVersion() {
    if (this._history.length === 0) return 0;
    const applied = this._history.filter((h) => h.appliedAt && !h.rolledBackAt);
    return applied.length ? applied[applied.length - 1].version : 0;
  }
}

module.exports = MigrationVersionTracker;
