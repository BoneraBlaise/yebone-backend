const crypto = require("crypto");
const AuditConfig = require("./AuditConfig");

/**
 * Extracts audit context from HTTP requests or explicit overrides.
 */
class AuditContext {
  static fromRequest(req, overrides = {}) {
    const headers = req?.headers || {};
    const lower = (name) => headers[name] || headers[name.toLowerCase()];

    const correlationId =
      overrides.correlationId ||
      lower("x-correlation-id") ||
      req?.correlationId ||
      req?.idempotencyContext?.correlationId ||
      crypto.randomUUID();

    const requestId =
      overrides.requestId ||
      lower("x-request-id") ||
      req?.idempotencyContext?.requestId ||
      crypto.randomUUID();

    const forwarded = lower("x-forwarded-for");
    const ipAddress =
      overrides.ipAddress ||
      (forwarded ? String(forwarded).split(",")[0].trim() : null) ||
      req?.ip ||
      req?.connection?.remoteAddress ||
      null;

    const userAgent =
      overrides.userAgent || lower("user-agent") || null;

    const device =
      overrides.device ||
      lower("x-device-id") ||
      lower("x-client-device") ||
      null;

    const actorId =
      overrides.actorId ||
      req?.user?._id?.toString?.() ||
      req?.user?.id?.toString?.() ||
      req?.seller?._id?.toString?.() ||
      AuditConfig.defaultActorId;

    const actorType = overrides.actorType || null;

    return {
      correlationId: String(correlationId).trim(),
      requestId: String(requestId).trim(),
      ipAddress: ipAddress ? String(ipAddress).trim() : null,
      userAgent: userAgent ? String(userAgent).trim() : null,
      device: device ? String(device).trim() : null,
      actorId: String(actorId).trim(),
      actorType,
    };
  }

  static merge(base = {}, extra = {}) {
    return {
      correlationId: extra.correlationId || base.correlationId,
      requestId: extra.requestId || base.requestId,
      ipAddress: extra.ipAddress ?? base.ipAddress ?? null,
      userAgent: extra.userAgent ?? base.userAgent ?? null,
      device: extra.device ?? base.device ?? null,
      actorId: extra.actorId || base.actorId,
      actorType: extra.actorType || base.actorType || null,
    };
  }
}

module.exports = AuditContext;
