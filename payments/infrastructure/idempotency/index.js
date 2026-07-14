const IdempotencyRepository = require("./IdempotencyRepository");
const MongoIdempotencyService = require("./MongoIdempotencyService");
const IdempotencyTtlCleanup = require("./IdempotencyTtlCleanup");
const IdempotencyConfig = require("./IdempotencyConfig");

/**
 * Factory for wiring MongoDB idempotency layer via DI.
 * Not auto-wired into PaymentModule in Module 1 — inject explicitly when ready.
 */
function createMongoIdempotencyLayer(options = {}) {
  const repository = options.repository || new IdempotencyRepository();
  const service = new MongoIdempotencyService({
    repository,
    scope: options.scope || null,
    ttlSeconds: options.ttlSeconds || IdempotencyConfig.defaultTtlSeconds,
    retryFailed: options.retryFailed !== false,
  });
  const cleanup = new IdempotencyTtlCleanup({
    repository,
    staleProcessingThresholdSeconds:
      options.staleProcessingThresholdSeconds ||
      IdempotencyConfig.staleProcessingThresholdSeconds,
  });

  return { repository, service, cleanup };
}

module.exports = {
  IdempotencyConfig,
  IdempotencyHelper: require("./IdempotencyHelper"),
  IdempotencyRecord: require("./IdempotencyRecord.model"),
  IdempotencyRepository,
  MongoIdempotencyService,
  IdempotencyMiddleware: require("./IdempotencyMiddleware"),
  IdempotencyTtlCleanup,
  InProgressRequestError: require("./errors/InProgressRequestError"),
  RequestIdConflictError: require("./errors/RequestIdConflictError"),
  createMongoIdempotencyLayer,
};
