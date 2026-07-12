/**
 * Configuration provider contract — no .env or dotenv.
 */
class ConfigurationProvider {
  get(key, defaultValue = null) {
    throw new Error("ConfigurationProvider.get must be implemented");
  }

  set(key, value) {
    throw new Error("ConfigurationProvider.set must be implemented");
  }

  has(key) {
    throw new Error("ConfigurationProvider.has must be implemented");
  }

  all() {
    throw new Error("ConfigurationProvider.all must be implemented");
  }
}

module.exports = ConfigurationProvider;
