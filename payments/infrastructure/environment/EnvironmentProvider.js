/**
 * Environment provider contract — no process.env dependency.
 */
class EnvironmentProvider {
  get(key, defaultValue = null) {
    throw new Error("EnvironmentProvider.get must be implemented");
  }

  set(key, value) {
    throw new Error("EnvironmentProvider.set must be implemented");
  }

  has(key) {
    throw new Error("EnvironmentProvider.has must be implemented");
  }

  all() {
    throw new Error("EnvironmentProvider.all must be implemented");
  }
}

module.exports = EnvironmentProvider;
