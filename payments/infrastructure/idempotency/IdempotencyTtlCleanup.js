const IdempotencyConfig = require("./IdempotencyConfig");

/**
 * Cleans up stale PROCESSING idempotency records.
 * MongoDB TTL handles expiresAt; this targets orphaned in-flight records.
 */
class IdempotencyTtlCleanup {
  constructor({
    repository,
    staleProcessingThresholdSeconds = IdempotencyConfig.staleProcessingThresholdSeconds,
  }) {
    if (!repository) {
      throw new Error("IdempotencyTtlCleanup requires a repository");
    }
    this.repository = repository;
    this.staleProcessingThresholdSeconds = staleProcessingThresholdSeconds;
  }

  async run() {
    const cutoff = new Date(
      Date.now() - this.staleProcessingThresholdSeconds * 1000
    );
    const removed = await this.repository.deleteStaleProcessing(cutoff);
    return {
      removed,
      cutoff: cutoff.toISOString(),
      thresholdSeconds: this.staleProcessingThresholdSeconds,
    };
  }
}

module.exports = IdempotencyTtlCleanup;
