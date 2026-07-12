/**
 * Immutable audit logger abstraction.
 */
class AuditLogger {
  constructor({ logger }) {
    this.logger = logger;
    this.entries = [];
  }

  record({ action, actorId, resourceId, category, payload = {} }) {
    const entry = Object.freeze({
      action,
      actorId: actorId || "system",
      resourceId,
      category,
      payload,
      recordedAt: new Date().toISOString(),
      immutable: true,
    });
    this.entries.push(entry);
    this.logger.info("Audit event", entry);
    return entry;
  }

  getEntries(filter = {}) {
    return this.entries.filter((e) => {
      if (filter.category && e.category !== filter.category) return false;
      if (filter.resourceId && e.resourceId !== filter.resourceId) return false;
      return true;
    });
  }
}

module.exports = AuditLogger;
