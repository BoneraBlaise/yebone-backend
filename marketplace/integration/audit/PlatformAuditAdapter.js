/**
 * Adapter — forwards legacy audit calls to PlatformAuditService.
 */
class PlatformAuditAdapter {
  static _audit() {
    try {
      const { getPlatformIntegration } = require("../PlatformIntegration");
      return getPlatformIntegration().audit;
    } catch (_error) {
      return null;
    }
  }

  static async record({
    platform,
    resource = null,
    action,
    actor = "system",
    oldValue = null,
    newValue = null,
    reason = null,
    correlationId = null,
    orderId = null,
    transactionId = null,
    metadata = {},
  } = {}) {
    const audit = PlatformAuditAdapter._audit();
    if (!audit) return null;

    return audit.record({
      platform,
      resource: resource || orderId || transactionId || platform,
      action,
      actor,
      oldValue,
      newValue,
      reason,
      correlationId,
      orderId,
      transactionId,
      metadata,
    });
  }

  static recordFinancial({ category, action, aggregateId, actorId = "system", payload = {}, metadata = {} }) {
    return PlatformAuditAdapter.record({
      platform: category || "financial",
      resource: aggregateId,
      action,
      actor: actorId,
      newValue: payload,
      correlationId: metadata.correlationId || null,
      transactionId: aggregateId,
      metadata,
    });
  }

  static recordConfiguration({ platform, resource, action, actor, oldValue, newValue, reason, correlationId }) {
    return PlatformAuditAdapter.record({
      platform: platform || "configuration",
      resource,
      action,
      actor,
      oldValue,
      newValue,
      reason,
      correlationId,
    });
  }

  static recordRuntime({ platform, action, actor, resource, newValue, correlationId, reason }) {
    return PlatformAuditAdapter.record({
      platform,
      resource,
      action,
      actor,
      newValue,
      correlationId,
      reason,
    });
  }
}

module.exports = PlatformAuditAdapter;
