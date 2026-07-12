class MigrationRegistry {
  constructor() {
    this._migrations = [];
  }

  register(migration) {
    this._migrations.push(migration);
    this._migrations.sort((a, b) => a.version - b.version);
    return this;
  }

  all() {
    return [...this._migrations];
  }

  get(version) {
    return this._migrations.find((m) => m.version === version) || null;
  }
}

module.exports = MigrationRegistry;
