class RepositoryRegistry {
  constructor() {
    this._repositories = new Map();
  }

  register(name, repository) {
    this._repositories.set(name, repository);
    return this;
  }

  get(name) {
    return this._repositories.get(name) || null;
  }

  list() {
    return [...this._repositories.keys()];
  }
}

module.exports = RepositoryRegistry;
