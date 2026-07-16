/**
 * Generic secret manager contract — architecture only; no cloud SDK.
 */
class SecretManagerProvider {
  async load(_secretKey) {
    throw new Error("SecretManagerProvider.load must be implemented");
  }

  async health() {
    throw new Error("SecretManagerProvider.health must be implemented");
  }

  async exists(_secretKey) {
    throw new Error("SecretManagerProvider.exists must be implemented");
  }
}

/**
 * Default no-op implementation — no external calls.
 */
class NoOpSecretManagerProvider extends SecretManagerProvider {
  async load() {
    return null;
  }

  async health() {
    return Object.freeze({ ok: true, provider: "noop" });
  }

  async exists() {
    return false;
  }
}

module.exports = {
  SecretManagerProvider,
  NoOpSecretManagerProvider,
};
