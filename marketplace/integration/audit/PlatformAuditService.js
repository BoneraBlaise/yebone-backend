const crypto = require("crypto");
const PlatformAudit = require("../../../model/platformAudit");

class PlatformAuditService {
  constructor({ useMemoryOnly = false, observability } = {}) {
    this.useMemoryOnly = useMemoryOnly;
    this.observability = observability;
    this.memory = [];
    this.maxMemory = 500;
  }

  _generateId() {
    return `pa_${Date.now()}_${crypto.randomBytes(4).toString("hex")}`;
  }

  async record({
    platform,
    resource = null,
    actor = "system",
    action,
    oldValue = null,
    newValue = null,
    reason = null,
    correlationId = null,
    orderId = null,
    transactionId = null,
    metadata = {},
  } = {}) {
    const entry = {
      auditId: this._generateId(),
      platform: String(platform),
      resource: resource ? String(resource) : orderId || transactionId || String(platform),
      actor: String(actor),
      action: String(action),
      oldValue,
      newValue,
      reason,
      correlationId,
      orderId: orderId ? String(orderId) : null,
      transactionId: transactionId ? String(transactionId) : null,
      metadata,
      timestamp: new Date(),
    };

    if (this.observability) {
      this.observability.increment("auditEvents");
      this.observability.record("audit", { platform, action, correlationId });
    }

    if (this.useMemoryOnly) {
      this.memory.push(entry);
      if (this.memory.length > this.maxMemory) this.memory.shift();
      return Object.freeze(entry);
    }

    const saved = await PlatformAudit.create(entry);
    return Object.freeze(saved.toObject());
  }

  async list({ platform, orderId, limit = 100 } = {}) {
    if (this.useMemoryOnly) {
      return this.memory
        .filter((e) => {
          if (platform && e.platform !== platform) return false;
          if (orderId && e.orderId !== String(orderId)) return false;
          return true;
        })
        .slice(-limit);
    }

    const query = {};
    if (platform) query.platform = platform;
    if (orderId) query.orderId = String(orderId);
    return PlatformAudit.find(query).sort({ timestamp: -1 }).limit(limit).lean();
  }

  async recordFromRequest(req, event = {}) {
    const PlatformAuthService = require("../auth/PlatformAuthService");
    const actor = PlatformAuthService.getActor(req);
    return this.record({
      ...event,
      actor: event.actor || actor.id,
    });
  }
}

module.exports = PlatformAuditService;
