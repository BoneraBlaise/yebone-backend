const DuplicateRequestError = require("../../orchestration/errors/DuplicateRequestError");
const IdempotencyHelper = require("./IdempotencyHelper");
const IdempotencyConfig = require("./IdempotencyConfig");
const InProgressRequestError = require("./errors/InProgressRequestError");

const { PROCESSING, COMPLETED, FAILED } = IdempotencyConfig.recordStatus;
const RETRY_CLAIM = Symbol("RETRY_IDEMPOTENCY_CLAIM");
const MAX_CLAIM_ATTEMPTS = 3;

/**
 * Production MongoDB idempotency service.
 * Implements the same execute() contract as the in-memory IdempotencyService
 * so orchestrators can swap implementations via DI without code changes.
 */
class MongoIdempotencyService {
  constructor({
    repository,
    scope = null,
    ttlSeconds = IdempotencyConfig.defaultTtlSeconds,
    retryFailed = true,
  }) {
    if (!repository) {
      throw new Error("MongoIdempotencyService requires a repository");
    }
    this.repository = repository;
    this.scope = scope;
    this.ttlSeconds = ttlSeconds;
    this.retryFailed = retryFailed;
  }

  fingerprint(payload) {
    return IdempotencyHelper.fingerprint(payload);
  }

  async has(key) {
    const record = await this.repository.findByKey(this.scope, key);
    return Boolean(record);
  }

  async get(key) {
    const record = await this.repository.findByKey(this.scope, key);
    if (!record) return null;
    return this._toLegacyRecord(record);
  }

  register(key, { fingerprint, result, metadata = {} }) {
    throw new Error(
      "MongoIdempotencyService.register() is not supported — use execute() for durable writes"
    );
  }

  detectDuplicate(key, fingerprint) {
    throw new Error(
      "MongoIdempotencyService.detectDuplicate() is async in MongoDB — use execute()"
    );
  }

  /**
   * Execute handler once per idempotency key + fingerprint pair (durable).
   *
   * @param {string} key
   * @param {Object} payload
   * @param {Function} handler
   * @param {Object} [context] - correlationId, requestId, paymentReference, metadata
   */
  async execute(key, payload, handler, context = {}) {
    const idempotencyKey = IdempotencyHelper.normalizeKey(key);
    const fingerprint = this.fingerprint(payload);
    const claimInput = this._buildClaimInput(idempotencyKey, fingerprint, context);

    for (let attempt = 0; attempt < MAX_CLAIM_ATTEMPTS; attempt += 1) {
      const claim = await this.repository.claimProcessing(claimInput);

      if (claim.claimed) {
        return this._runHandler(idempotencyKey, handler);
      }

      const outcome = await this._handleExisting(
        claim.record,
        fingerprint,
        idempotencyKey
      );

      if (outcome === RETRY_CLAIM) {
        continue;
      }

      return outcome;
    }

    throw new InProgressRequestError(idempotencyKey);
  }

  _buildClaimInput(idempotencyKey, fingerprint, context = {}) {
    const correlationId = context.correlationId || idempotencyKey;
    const requestId =
      context.requestId || `${idempotencyKey}:${fingerprint}`;

    return {
      scope: this.scope,
      idempotencyKey,
      fingerprint,
      correlationId,
      requestId,
      paymentReference: context.paymentReference || null,
      metadata: context.metadata || {},
      expiresAt: IdempotencyHelper.computeExpiresAt(this.ttlSeconds),
    };
  }

  async _handleExisting(existing, fingerprint, idempotencyKey) {
    if (!existing) {
      throw new Error(
        `Idempotency claim conflict without record for key: ${idempotencyKey}`
      );
    }

    if (existing.fingerprint !== fingerprint) {
      throw new DuplicateRequestError(idempotencyKey);
    }

    if (existing.status === COMPLETED) {
      return { replayed: true, result: existing.result };
    }

    if (existing.status === PROCESSING) {
      throw new InProgressRequestError(idempotencyKey);
    }

    if (existing.status === FAILED && this.retryFailed) {
      const deleted = await this.repository.deleteByKey(this.scope, idempotencyKey);
      if (deleted?.deletedCount > 0) {
        return RETRY_CLAIM;
      }
      throw new InProgressRequestError(idempotencyKey);
    }

    throw new InProgressRequestError(idempotencyKey);
  }

  async _runHandler(idempotencyKey, handler) {
    try {
      const result = await handler();
      const completed = await this.repository.markCompleted(this.scope, idempotencyKey, result);
      if (!completed) {
        const latest = await this.repository.findByKey(this.scope, idempotencyKey);
        if (latest?.status === COMPLETED) {
          return { replayed: true, result: latest.result };
        }
        throw new InProgressRequestError(idempotencyKey);
      }
      return { replayed: false, result };
    } catch (error) {
      await this.repository.markFailed(this.scope, idempotencyKey, {
        message: error.message,
        name: error.name,
      });
      throw error;
    }
  }

  _toLegacyRecord(record) {
    return Object.freeze({
      key: record.idempotencyKey,
      fingerprint: record.fingerprint,
      result: record.result,
      metadata: record.metadata || {},
      createdAt: record.createdAt?.toISOString?.() || record.createdAt,
      replayProtected: true,
      status: record.status,
      correlationId: record.correlationId,
      requestId: record.requestId,
      paymentReference: record.paymentReference,
    });
  }
}

module.exports = MongoIdempotencyService;
