/**
 * Secret provider contract — no vault integration.
 */
class SecretProvider {
  get(key) {
    throw new Error("SecretProvider.get must be implemented");
  }

  set(key, value) {
    throw new Error("SecretProvider.set must be implemented");
  }

  has(key) {
    throw new Error("SecretProvider.has must be implemented");
  }

  delete(key) {
    throw new Error("SecretProvider.delete must be implemented");
  }
}

module.exports = SecretProvider;
