const AuditConfig = require("./AuditConfig");
const AuditHelper = require("./AuditHelper");
const AuditSanitizer = require("./AuditSanitizer");
const AuditContext = require("./AuditContext");
const { ActorType } = require("./AuditEvent");

/**
 * Production audit logging service — append-only financial event trail.
 */
class AuditService {
  constructor({ repository, sanitizer = AuditSanitizer }) {
    if (!repository) {
      throw new Error("AuditService requires a repository");
    }
    this.repository = repository;
    this.sanitizer = sanitizer;
  }

  /**
   * Record an immutable audit event.
   */
  async record(event = {}) {
    const context = AuditContext.merge({}, event.context || {});

    const actorType = AuditHelper.validateActorType(
      event.actorType || context.actorType || AuditConfig.defaultActorType
    );
    const resourceType = AuditHelper.validateResourceType(event.resourceType);
    const action = AuditHelper.validateAction(event.action);

    const record = this.sanitizer.sanitizeRecord({
      auditId: event.auditId || AuditHelper.generateAuditId(),
      correlationId: AuditHelper.normalizeId(
        event.correlationId || context.correlationId,
        "correlationId"
      ),
      requestId: AuditHelper.normalizeId(
        event.requestId || context.requestId,
        "requestId"
      ),
      actorId: AuditHelper.normalizeId(
        event.actorId || context.actorId || AuditConfig.defaultActorId,
        "actorId"
      ),
      actorType,
      resourceType,
      resourceId: AuditHelper.normalizeId(event.resourceId, "resourceId"),
      action,
      before: event.before ?? null,
      after: event.after ?? null,
      metadata: event.metadata ?? {},
      ipAddress: AuditHelper.normalizeOptional(event.ipAddress ?? context.ipAddress),
      device: AuditHelper.normalizeOptional(event.device ?? context.device),
      userAgent: AuditHelper.normalizeOptional(event.userAgent ?? context.userAgent),
      timestamp: event.timestamp ? new Date(event.timestamp) : new Date(),
    });

    const payloadSize = AuditHelper.estimatePayloadSize({
      before: record.before,
      after: record.after,
      metadata: record.metadata,
    });
    if (payloadSize > AuditConfig.maxPayloadBytes) {
      throw new Error(
        `Audit payload exceeds maximum size of ${AuditConfig.maxPayloadBytes} bytes`
      );
    }

    const saved = await this.repository.append(record);
    return Object.freeze(saved);
  }

  async recordFromRequest(req, event = {}) {
    const context = AuditContext.fromRequest(req, event.context || {});
    return this.record({
      ...event,
      context,
      correlationId: event.correlationId || context.correlationId,
      requestId: event.requestId || context.requestId,
      actorId: event.actorId || context.actorId,
      actorType: event.actorType || context.actorType || ActorType.SYSTEM,
      ipAddress: event.ipAddress || context.ipAddress,
      device: event.device || context.device,
      userAgent: event.userAgent || context.userAgent,
    });
  }

  async getByAuditId(auditId) {
    return this.repository.findByAuditId(auditId);
  }

  async getByCorrelationId(correlationId, options) {
    return this.repository.findByCorrelationId(correlationId, options);
  }

  async getByResource(resourceType, resourceId, options) {
    return this.repository.findByResource(resourceType, resourceId, options);
  }

  async getByRequestId(requestId, options) {
    return this.repository.findByRequestId(requestId, options);
  }

  async getByActor(actorId, options) {
    return this.repository.findByActor(actorId, options);
  }

  async getByAction(action, options) {
    return this.repository.findByAction(action, options);
  }
}

module.exports = AuditService;
