const AuditLog = require("./AuditLog.model");
const ImmutableAuditError = require("./errors/ImmutableAuditError");

/**
 * Append-only MongoDB repository for payment_audit_logs.
 * No update or delete methods are exposed.
 */
class AuditRepository {
  constructor({ model = AuditLog } = {}) {
    this.model = model;
  }

  async ensureIndexes() {
    try {
      await this.model.createIndexes();
    } catch (error) {
      if (error?.code !== 85 && error?.codeName !== "IndexOptionsConflict") {
        throw error;
      }
    }
  }

  async append(record) {
    const doc = await this.model.create(record);
    return doc.toObject();
  }

  async findByAuditId(auditId) {
    return this.model.findOne({ auditId }).lean();
  }

  async findByCorrelationId(correlationId, { limit = 100, skip = 0 } = {}) {
    if (!correlationId) return [];
    return this.model
      .find({ correlationId })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();
  }

  async findByRequestId(requestId, { limit = 100, skip = 0 } = {}) {
    if (!requestId) return [];
    return this.model
      .find({ requestId })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();
  }

  async findByResource(resourceType, resourceId, { limit = 100, skip = 0 } = {}) {
    if (!resourceType || !resourceId) return [];
    return this.model
      .find({ resourceType, resourceId })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();
  }

  async findByActor(actorId, { limit = 100, skip = 0 } = {}) {
    if (!actorId) return [];
    return this.model
      .find({ actorId })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();
  }

  async findByAction(action, { limit = 100, skip = 0 } = {}) {
    if (!action) return [];
    return this.model
      .find({ action: String(action).toUpperCase() })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();
  }

  async countDocuments(filter = {}) {
    return this.model.countDocuments(filter);
  }

  assertImmutableOperation() {
    throw new ImmutableAuditError();
  }
}

module.exports = AuditRepository;
