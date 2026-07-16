/**
 * Generic vault contract — architecture only; no vault integration.
 */
class VaultProvider {
  async load(_secretPath) {
    throw new Error("VaultProvider.load must be implemented");
  }

  async health() {
    throw new Error("VaultProvider.health must be implemented");
  }

  async exists(_secretPath) {
    throw new Error("VaultProvider.exists must be implemented");
  }
}

/**
 * Default no-op implementation — no external calls.
 */
class NoOpVaultProvider extends VaultProvider {
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
  VaultProvider,
  NoOpVaultProvider,
};
