const IdempotencyRecord = require("./IdempotencyRecord.model");
const IdempotencyConfig = require("./IdempotencyConfig");
const RequestIdConflictError = require("./errors/RequestIdConflictError");

const { PROCESSING, COMPLETED, FAILED } = IdempotencyConfig.recordStatus;

/**
 * MongoDB persistence for idempotency records.
 * Repository pattern — no business logic beyond CRUD and atomic claims.
 */
class IdempotencyRepository {
  constructor({ model = IdempotencyRecord } = {}) {
    this.model = model;
  }

  async ensureIndexes() {
    try {
      await this.model.createIndexes();
    } catch (error) {
      // Production may already have equivalent indexes under legacy auto-generated names.
      if (error?.code !== 85 && error?.codeName !== "IndexOptionsConflict") {
        throw error;
      }
    }
  }

  async findByKey(scope, idempotencyKey) {
    return this.model.findOne({ scope: scope || null, idempotencyKey }).lean();
  }

  async findByRequestId(requestId) {
    if (!requestId) return null;
    return this.model.findOne({ requestId }).lean();
  }

  /**
   * Atomically claim an idempotency key for processing.
   * Returns { claimed: true, record } on success.
   * Returns { claimed: false, record } when key already exists.
   */
  async claimProcessing({
    scope = null,
    idempotencyKey,
    fingerprint,
    correlationId,
    requestId,
    paymentReference = null,
    metadata = {},
    expiresAt,
  }) {
    try {
      const record = await this.model.create({
        scope,
        idempotencyKey,
        fingerprint,
        correlationId,
        requestId,
        paymentReference,
        metadata,
        status: PROCESSING,
        expiresAt,
      });
      return { claimed: true, record: record.toObject() };
    } catch (error) {
      if (error?.code !== 11000) {
        throw error;
      }

      const existingByKey = await this.findByKey(scope, idempotencyKey);
      if (existingByKey) {
        return { claimed: false, record: existingByKey };
      }

      const existingByRequest = await this.findByRequestId(requestId);
      if (existingByRequest) {
        throw new RequestIdConflictError(requestId, existingByRequest.idempotencyKey);
      }

      throw error;
    }
  }

  async markCompleted(scope, idempotencyKey, result) {
    return this.model
      .findOneAndUpdate(
        { scope: scope || null, idempotencyKey, status: PROCESSING },
        { $set: { status: COMPLETED, result } },
        { new: true }
      )
      .lean();
  }

  async markFailed(scope, idempotencyKey, errorPayload = null) {
    return this.model
      .findOneAndUpdate(
        { scope: scope || null, idempotencyKey, status: PROCESSING },
        {
          $set: {
            status: FAILED,
            result: errorPayload,
          },
        },
        { new: true }
      )
      .lean();
  }

  async deleteByKey(scope, idempotencyKey) {
    return this.model.deleteOne({ scope: scope || null, idempotencyKey });
  }

  /**
   * Remove stale PROCESSING records (e.g. crashed workers).
   */
  async deleteStaleProcessing(olderThanDate) {
    const result = await this.model.deleteMany({
      status: PROCESSING,
      createdAt: { $lt: olderThanDate },
    });
    return result.deletedCount || 0;
  }

  async countDocuments(filter = {}) {
    return this.model.countDocuments(filter);
  }
}

module.exports = IdempotencyRepository;
