/**
 * Environment provider contract.
 */
class EnvironmentProvider {
  get(key, defaultValue) {
    throw new Error("EnvironmentProvider.get must be implemented");
  }

  getAll() {
    throw new Error("EnvironmentProvider.getAll must be implemented");
  }

  getProfile() {
    throw new Error("EnvironmentProvider.getProfile must be implemented");
  }
}

module.exports = EnvironmentProvider;
